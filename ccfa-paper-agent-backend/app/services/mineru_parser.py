import asyncio
import base64
import mimetypes
import posixpath
import re
import time
import zipfile
from dataclasses import dataclass
from io import BytesIO
from pathlib import PurePosixPath
from typing import Any, Optional
from urllib.parse import urljoin, urlparse

import httpx

from app.core.config import Settings
from app.schemas.mineru import MinerUAsset, MinerUMarkdownStats, MinerUParseResponse, MinerUSection


class MinerUParseError(RuntimeError):
    pass


@dataclass(frozen=True)
class MinerUOptions:
    language: str = "en"
    page_range: Optional[str] = None
    enable_table: bool = True
    is_ocr: bool = False
    enable_formula: bool = True


def analyze_markdown(markdown: str) -> tuple[list[MinerUSection], MinerUMarkdownStats]:
    sections: list[MinerUSection] = []
    for line_number, line in enumerate(markdown.splitlines(), start=1):
        match = re.match(r"^(#{1,6})\s+(.+?)\s*$", line)
        if match:
            sections.append(
                MinerUSection(
                    title=match.group(2).strip(),
                    level=len(match.group(1)),
                    lineNumber=line_number,
                )
            )

    image_count = len(re.findall(r"!\[[^\]]*\]\([^)]+\)", markdown))
    html_table_count = len(re.findall(r"<table\b", markdown, flags=re.IGNORECASE))
    markdown_table_count = len(
        re.findall(r"^\s*\|.+\|\s*\n\s*\|[\s:|-]+\|", markdown, flags=re.MULTILINE)
    )
    display_formula_count = len(re.findall(r"\$\$[\s\S]+?\$\$", markdown))
    inline_formula_count = len(re.findall(r"(?<!\$)\$[^$\n]{2,}\$(?!\$)", markdown))

    stats = MinerUMarkdownStats(
        sectionCount=len(sections),
        imageCount=image_count,
        tableCount=html_table_count + markdown_table_count,
        formulaCount=display_formula_count + inline_formula_count,
    )
    return sections, stats


def _is_relative_asset_url(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme or parsed.netloc:
        return False
    if url.startswith(("#", "/", "data:", "mailto:", "local-image:")):
        return False
    return True


def resolve_markdown_asset_urls(markdown: str, markdown_url: str) -> str:
    """Make lightweight MinerU relative image URLs usable after the Markdown is saved alone."""

    def replace_markdown_image(match: re.Match[str]) -> str:
        alt_text = match.group("alt")
        raw_target = match.group("target").strip()
        target = raw_target[1:-1] if raw_target.startswith("<") and raw_target.endswith(">") else raw_target
        title = match.group("title") or ""
        if not _is_relative_asset_url(target):
            return match.group(0)
        return f"![{alt_text}]({urljoin(markdown_url, target)}{title})"

    markdown = re.sub(
        r"!\[(?P<alt>[^\]]*)\]\((?P<target><[^>]+>|[^\s)]+)(?P<title>\s+[^)]*)?\)",
        replace_markdown_image,
        markdown,
    )

    def replace_html_image(match: re.Match[str]) -> str:
        before = match.group("before")
        url = match.group("url")
        after = match.group("after")
        if not _is_relative_asset_url(url):
            return match.group(0)
        return f'{before}{urljoin(markdown_url, url)}{after}'

    return re.sub(
        r'(?P<before><img\b[^>]*\bsrc=["\'])(?P<url>[^"\']+)(?P<after>["\'][^>]*>)',
        replace_html_image,
        markdown,
        flags=re.IGNORECASE,
    )


def _mineru_failure_message(result: dict[str, Any], fallback: str) -> str:
    message = result.get("msg") or fallback
    data = result.get("data")
    if isinstance(data, dict):
        error_message = data.get("err_msg")
        error_code = data.get("err_code")
        if error_message:
            return f"{message}: {error_message} ({error_code})"
    return str(message)


def _authorization_headers(settings: Settings) -> dict[str, str]:
    token = settings.mineru_api_token.strip()
    if not token:
        raise MinerUParseError(
            "MinerU precision parsing requires MINERU_API_TOKEN. "
            "Create a token at MinerU API management and add it to backend .env."
        )
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "*/*",
    }


def _ensure_success_response(result: dict[str, Any], fallback: str) -> dict[str, Any]:
    if result.get("code") != 0:
        raise MinerUParseError(_mineru_failure_message(result, fallback))
    data = result.get("data")
    if not isinstance(data, dict):
        raise MinerUParseError(f"{fallback}: MinerU returned no data object")
    return data


def _read_zip_text(zip_file: zipfile.ZipFile, member_name: str) -> str:
    raw = zip_file.read(member_name)
    return raw.decode("utf-8", errors="replace")


def _find_full_markdown(zip_file: zipfile.ZipFile) -> str:
    names = [name for name in zip_file.namelist() if not name.endswith("/")]
    markdown_matches = [name for name in names if name.lower().endswith(".md")]
    if not markdown_matches:
        raise MinerUParseError("MinerU precision zip did not contain a Markdown file.")

    scored = sorted(
        ((len(_read_zip_text(zip_file, name).strip()), name) for name in markdown_matches),
        reverse=True,
    )
    longest_length, longest_name = scored[0]
    exact_matches = [name for name in markdown_matches if PurePosixPath(name).name == "full.md"]
    if exact_matches:
        exact_name = sorted(exact_matches, key=len)[0]
        exact_length = len(_read_zip_text(zip_file, exact_name).strip())
        if exact_length >= longest_length * 0.8:
            return exact_name

    return longest_name


def _zip_image_assets(zip_file: zipfile.ZipFile, markdown_member: str) -> list[MinerUAsset]:
    assets: list[MinerUAsset] = []
    base_dir = posixpath.dirname(markdown_member)
    for name in zip_file.namelist():
        if name.endswith("/"):
            continue
        mime_type, _encoding = mimetypes.guess_type(name)
        if not mime_type or not mime_type.startswith("image/"):
            continue
        encoded = base64.b64encode(zip_file.read(name)).decode("ascii")
        normalized = posixpath.normpath(name).lstrip("./")
        relative_path = posixpath.relpath(normalized, base_dir).lstrip("./") if base_dir else normalized
        assets.append(
            MinerUAsset(
                path=relative_path,
                mimeType=mime_type,
                dataUrl=f"data:{mime_type};base64,{encoded}",
            )
        )
    return assets


def markdown_from_precision_zip(zip_bytes: bytes) -> tuple[str, list[MinerUAsset]]:
    with zipfile.ZipFile(BytesIO(zip_bytes)) as zip_file:
        markdown_member = _find_full_markdown(zip_file)
        markdown = _read_zip_text(zip_file, markdown_member)
        assets = _zip_image_assets(zip_file, markdown_member)
        return markdown, assets


async def parse_pdf_with_mineru_precision(
    *,
    file_name: str,
    file_bytes: bytes,
    options: MinerUOptions,
    settings: Settings,
) -> MinerUParseResponse:
    base_url = settings.mineru_precision_base_url.rstrip("/")
    timeout = httpx.Timeout(settings.mineru_request_timeout_seconds, connect=30.0)
    headers = _authorization_headers(settings)

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        file_payload: dict[str, Any] = {
            "name": file_name,
            "data_id": re.sub(r"[^A-Za-z0-9_.-]", "_", file_name)[:96],
            "is_ocr": options.is_ocr,
        }
        if options.page_range:
            file_payload["page_ranges"] = options.page_range

        create_payload: dict[str, Any] = {
            "files": [file_payload],
            "model_version": settings.mineru_precision_model,
            "language": options.language,
            "enable_table": options.enable_table,
            "enable_formula": options.enable_formula,
        }

        create_response = await client.post(
            f"{base_url}/file-urls/batch",
            json=create_payload,
            headers=headers,
        )
        create_response.raise_for_status()
        create_data = _ensure_success_response(
            create_response.json(),
            "MinerU precision upload URL creation failed",
        )

        batch_id = create_data.get("batch_id")
        upload_urls = create_data.get("file_urls") or []
        upload_url = upload_urls[0] if upload_urls else None
        if not batch_id or not upload_url:
            raise MinerUParseError("MinerU precision API did not return a batch id or upload URL")

        upload_response = await client.put(upload_url, content=file_bytes)
        if upload_response.status_code not in (200, 201, 204):
            detail = upload_response.text.strip()[:300]
            suffix = f": {detail}" if detail else ""
            raise MinerUParseError(
                f"MinerU precision file upload failed with HTTP {upload_response.status_code}{suffix}"
            )

        started_at = time.monotonic()
        last_state = "waiting-file"
        while time.monotonic() - started_at < settings.mineru_parse_timeout_seconds:
            status_response = await client.get(
                f"{base_url}/extract-results/batch/{batch_id}",
                headers=headers,
            )
            status_response.raise_for_status()
            status_data = _ensure_success_response(
                status_response.json(),
                "MinerU precision status query failed",
            )
            extract_results = status_data.get("extract_result") or []
            extract_result = extract_results[0] if extract_results else {}
            last_state = extract_result.get("state") or last_state

            if last_state == "done":
                full_zip_url = extract_result.get("full_zip_url")
                if not full_zip_url:
                    raise MinerUParseError("MinerU precision parsing finished without full_zip_url")
                zip_response = await client.get(full_zip_url)
                zip_response.raise_for_status()
                markdown, assets = markdown_from_precision_zip(zip_response.content)
                sections, stats = analyze_markdown(markdown)
                return MinerUParseResponse(
                    taskId=batch_id,
                    markdownUrl=full_zip_url,
                    markdown=markdown,
                    assets=assets,
                    sections=sections,
                    stats=stats,
                )

            if last_state == "failed":
                err_msg = extract_result.get("err_msg") or "MinerU precision parsing failed"
                raise MinerUParseError(str(err_msg))

            await asyncio.sleep(settings.mineru_poll_interval_seconds)

    raise MinerUParseError(f"MinerU precision parsing timed out while task state was {last_state}")


async def parse_pdf_with_mineru_lightweight(
    *,
    file_name: str,
    file_bytes: bytes,
    options: MinerUOptions,
    settings: Settings,
) -> MinerUParseResponse:
    base_url = settings.mineru_agent_base_url.rstrip("/")
    timeout = httpx.Timeout(settings.mineru_request_timeout_seconds, connect=30.0)

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        create_payload: dict[str, Any] = {
            "file_name": file_name,
            "language": options.language,
            "enable_table": options.enable_table,
            "is_ocr": options.is_ocr,
            "enable_formula": options.enable_formula,
        }
        if options.page_range:
            create_payload["page_range"] = options.page_range

        create_response = await client.post(f"{base_url}/parse/file", json=create_payload)
        create_response.raise_for_status()
        create_result = create_response.json()
        if create_result.get("code") != 0:
            raise MinerUParseError(_mineru_failure_message(create_result, "MinerU task creation failed"))

        data = create_result.get("data") or {}
        task_id = data.get("task_id")
        upload_url = data.get("file_url")
        if not task_id or not upload_url:
            raise MinerUParseError("MinerU did not return a task id or upload URL")

        upload_response = await client.put(upload_url, content=file_bytes)
        if upload_response.status_code not in (200, 201, 204):
            detail = upload_response.text.strip()[:300]
            suffix = f": {detail}" if detail else ""
            raise MinerUParseError(
                f"MinerU file upload failed with HTTP {upload_response.status_code}{suffix}"
            )

        started_at = time.monotonic()
        last_state = "waiting-file"
        while time.monotonic() - started_at < settings.mineru_parse_timeout_seconds:
            status_response = await client.get(f"{base_url}/parse/{task_id}")
            status_response.raise_for_status()
            status_result = status_response.json()
            if status_result.get("code") != 0:
                raise MinerUParseError(_mineru_failure_message(status_result, "MinerU status query failed"))

            status_data = status_result.get("data") or {}
            last_state = status_data.get("state") or last_state

            if last_state == "done":
                markdown_url = status_data.get("markdown_url")
                if not markdown_url:
                    raise MinerUParseError("MinerU finished without returning a Markdown URL")
                markdown_response = await client.get(markdown_url)
                markdown_response.raise_for_status()
                markdown = resolve_markdown_asset_urls(markdown_response.text, markdown_url)
                sections, stats = analyze_markdown(markdown)
                return MinerUParseResponse(
                    taskId=task_id,
                    markdownUrl=markdown_url,
                    markdown=markdown,
                    assets=[],
                    sections=sections,
                    stats=stats,
                )

            if last_state == "failed":
                raise MinerUParseError(_mineru_failure_message(status_result, "MinerU parsing failed"))

            await asyncio.sleep(settings.mineru_poll_interval_seconds)

    raise MinerUParseError(f"MinerU parsing timed out while task state was {last_state}")


async def parse_pdf_with_mineru(
    *,
    file_name: str,
    file_bytes: bytes,
    options: MinerUOptions,
    settings: Settings,
) -> MinerUParseResponse:
    if settings.mineru_parse_mode == "lightweight":
        return await parse_pdf_with_mineru_lightweight(
            file_name=file_name,
            file_bytes=file_bytes,
            options=options,
            settings=settings,
        )

    return await parse_pdf_with_mineru_precision(
        file_name=file_name,
        file_bytes=file_bytes,
        options=options,
        settings=settings,
    )
