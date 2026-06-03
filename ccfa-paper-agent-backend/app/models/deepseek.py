from __future__ import annotations

from typing import Any

from agents import AsyncOpenAI, OpenAIChatCompletionsModel

from app.core.config import Settings


def _item_value(item: Any, key: str) -> Any:
    if isinstance(item, dict):
        return item.get(key)
    return getattr(item, key, None)


def _content_has_text(content: Any) -> bool:
    if content is None:
        return False
    if isinstance(content, str):
        return bool(content.strip())
    if not isinstance(content, list):
        return True

    for part in content:
        if isinstance(part, str):
            if part.strip():
                return True
            continue

        text = _item_value(part, "text")
        refusal = _item_value(part, "refusal")
        if isinstance(text, str) and text.strip():
            return True
        if isinstance(refusal, str) and refusal.strip():
            return True

        part_type = _item_value(part, "type")
        if part_type not in {None, "output_text", "input_text", "summary_text", "refusal"}:
            return True

    return False


def _is_empty_assistant_message(item: Any) -> bool:
    if _item_value(item, "role") != "assistant":
        return False
    if _item_value(item, "type") not in {None, "message"}:
        return False
    return not _content_has_text(_item_value(item, "content"))


def _is_tool_call(item: Any) -> bool:
    return _item_value(item, "type") == "function_call" and bool(_item_value(item, "call_id"))


def _is_tool_output(item: Any) -> bool:
    return _item_value(item, "type") == "function_call_output" and bool(
        _item_value(item, "call_id")
    )


def _is_tool_sequence_barrier(item: Any) -> bool:
    item_type = _item_value(item, "type")
    role = _item_value(item, "role")
    if item_type == "reasoning":
        return False
    return role in {"user", "system", "developer", "assistant"} or item_type == "message"


def sanitize_deepseek_chat_input(input_items: Any) -> Any:
    """Normalize Agents SDK response items before strict Chat Completions validation.

    DeepSeek rejects an assistant tool_calls message unless it is immediately
    followed by matching tool messages. Interrupted/streamed runs can leave empty
    assistant messages or dangling tool fragments in the item list.
    """
    if isinstance(input_items, str) or not isinstance(input_items, list):
        return input_items

    sanitized: list[Any] = []
    pending_call_ids: set[str] = set()
    pending_call_indexes: dict[str, int] = {}
    drop_indexes: set[int] = set()

    def drop_pending_calls() -> None:
        drop_indexes.update(pending_call_indexes.values())
        pending_call_ids.clear()
        pending_call_indexes.clear()

    for item in input_items:
        if _is_empty_assistant_message(item):
            continue

        if _is_tool_call(item):
            call_id = str(_item_value(item, "call_id"))
            pending_call_ids.add(call_id)
            pending_call_indexes[call_id] = len(sanitized)
            sanitized.append(item)
            continue

        if _is_tool_output(item):
            call_id = str(_item_value(item, "call_id"))
            if call_id not in pending_call_ids:
                continue
            sanitized.append(item)
            pending_call_ids.remove(call_id)
            pending_call_indexes.pop(call_id, None)
            continue

        if pending_call_ids and _is_tool_sequence_barrier(item):
            drop_pending_calls()

        sanitized.append(item)

    if pending_call_ids:
        drop_pending_calls()

    if not drop_indexes:
        return sanitized
    return [item for index, item in enumerate(sanitized) if index not in drop_indexes]


class DeepSeekChatCompletionsModel(OpenAIChatCompletionsModel):
    async def _fetch_response(
        self,
        system_instructions: str | None,
        input: Any,
        *args: Any,
        **kwargs: Any,
    ) -> Any:
        return await super()._fetch_response(
            system_instructions,
            sanitize_deepseek_chat_input(input),
            *args,
            **kwargs,
        )


def create_deepseek_model(settings: Settings) -> OpenAIChatCompletionsModel:
    client = AsyncOpenAI(
        api_key=settings.deepseek_api_key,
        base_url=settings.deepseek_base_url,
    )

    return DeepSeekChatCompletionsModel(
        model=settings.deepseek_model,
        openai_client=client,
    )
