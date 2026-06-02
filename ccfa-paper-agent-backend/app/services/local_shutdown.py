from __future__ import annotations

import os
import signal
import subprocess
import sys
import time


BACKEND_PORT = 8000
FRONTEND_PORT = 5173


def _address_matches_port(address: str, port: int) -> bool:
    return address.endswith(f":{port}")


def _listening_pids_windows(port: int) -> set[int]:
    result = subprocess.run(
        ["netstat", "-ano", "-p", "tcp"],
        capture_output=True,
        text=True,
        errors="ignore",
        check=False,
    )
    pids: set[int] = set()
    for line in result.stdout.splitlines():
        parts = line.split()
        if len(parts) < 5 or parts[0].upper() != "TCP":
            continue
        local_address, state, pid_text = parts[1], parts[3], parts[4]
        if state.upper() != "LISTENING" or not _address_matches_port(local_address, port):
            continue
        try:
            pids.add(int(pid_text))
        except ValueError:
            continue
    return pids


def _listening_pids_posix(port: int) -> set[int]:
    result = subprocess.run(
        ["lsof", f"-tiTCP:{port}", "-sTCP:LISTEN"],
        capture_output=True,
        text=True,
        errors="ignore",
        check=False,
    )
    pids: set[int] = set()
    for line in result.stdout.splitlines():
        try:
            pids.add(int(line.strip()))
        except ValueError:
            continue
    return pids


def get_listening_pids(port: int) -> set[int]:
    if sys.platform.startswith("win"):
        return _listening_pids_windows(port)
    return _listening_pids_posix(port)


def _terminate_pid(pid: int) -> None:
    if sys.platform.startswith("win"):
        subprocess.run(
            ["taskkill", "/PID", str(pid), "/T", "/F"],
            capture_output=True,
            text=True,
            errors="ignore",
            check=False,
        )
        return

    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        return


def shutdown_local_services_after_response(
    backend_pids: list[int],
    frontend_pids: list[int],
) -> None:
    time.sleep(0.5)
    current_pid = os.getpid()

    for pid in frontend_pids:
        if pid != current_pid:
            _terminate_pid(pid)

    for pid in backend_pids:
        if pid != current_pid:
            _terminate_pid(pid)

    if current_pid in backend_pids:
        _terminate_pid(current_pid)


def collect_local_service_pids() -> tuple[list[int], list[int]]:
    frontend_pids = sorted(get_listening_pids(FRONTEND_PORT))
    backend_pids = sorted(get_listening_pids(BACKEND_PORT) | {os.getpid()})
    return backend_pids, frontend_pids
