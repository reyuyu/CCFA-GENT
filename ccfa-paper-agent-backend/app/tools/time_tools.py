from __future__ import annotations

from datetime import datetime
from typing import Any

from agents import function_tool


@function_tool
def get_current_local_time() -> dict[str, Any]:
    """Return the backend machine's current local date, time, timezone, and year."""
    now = datetime.now().astimezone()
    return {
        "iso": now.isoformat(),
        "date": now.date().isoformat(),
        "year": now.year,
        "month": now.month,
        "day": now.day,
        "timezone": now.tzname(),
        "utcOffset": now.strftime("%z"),
    }


TIME_TOOLS = [
    get_current_local_time,
]
