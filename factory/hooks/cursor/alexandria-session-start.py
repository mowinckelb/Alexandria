#!/usr/bin/env python3
"""Cursor hook: inject Alexandria context at session start."""

from __future__ import annotations

import json
import os
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_MAX_CONTEXT_CHARS = 90000


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _emit(obj: dict) -> None:
    sys.stdout.write(json.dumps(obj, ensure_ascii=False))
    sys.stdout.flush()


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() not in {"0", "false", "no", "off", ""}


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None:
        return default
    try:
        return int(raw.strip())
    except (TypeError, ValueError):
        return default


def _safe_resolve(path: Path) -> Path:
    try:
        return path.expanduser().resolve()
    except OSError:
        return path.expanduser()


def _read_or_note(path: Path, label: str) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError as exc:
        return f"(Failed to read {label} at `{path}`: {exc})\n"


def _truncate(text: str, max_chars: int) -> tuple[str, bool]:
    if max_chars < 1:
        return "", False
    if len(text) <= max_chars:
        return text, False
    marker = "\n\n[... truncated by session-start context budget ...]\n"
    room = max(0, max_chars - len(marker))
    return text[:room].rstrip() + marker, True


def _append_jsonl(path: Path, row: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


def _latest_source_mtime(source_dir: Path) -> float | None:
    if not source_dir.is_dir():
        return None
    latest: float | None = None
    for path in source_dir.glob("*.md"):
        if path.name.startswith("_"):
            continue
        try:
            mtime = path.stat().st_mtime
        except OSError:
            continue
        if latest is None or mtime > latest:
            latest = mtime
    return latest


def _derivative_status(source_dir: Path, derivative_path: Path) -> str:
    if not derivative_path.is_file():
        return "missing"
    try:
        derivative_mtime = derivative_path.stat().st_mtime
    except OSError:
        return "unknown"
    source_mtime = _latest_source_mtime(source_dir)
    if source_mtime is None:
        return "unknown"
    return "stale" if source_mtime > derivative_mtime else "fresh"


def _resolve_root(home: Path) -> Path:
    raw = (os.environ.get("ALEXANDRIA_ROOT") or "").strip()
    if raw:
        p = _safe_resolve(Path(raw))
        if p.is_dir():
            return p
    return _safe_resolve(home / "alexandria")


def _resolve_agent_path(home: Path, root: Path) -> Path:
    env_agent = (os.environ.get("ALEXANDRIA_AGENT_MD") or "").strip()
    candidates: list[Path] = []
    if env_agent:
        candidates.append(_safe_resolve(Path(env_agent)))
    candidates.append(_safe_resolve(root / "files" / "core" / "agent.md"))
    candidates.append(_safe_resolve(home / ".alexandria" / "agent.md"))
    candidates.append(_safe_resolve(home / "alexandria" / "files" / "core" / "agent.md"))

    seen: set[str] = set()
    unique: list[Path] = []
    for candidate in candidates:
        key = str(candidate)
        if key not in seen:
            seen.add(key)
            unique.append(candidate)

    for candidate in unique:
        if candidate.is_file():
            return candidate
    return unique[0]


def _derive_root(agent_path: Path, fallback: Path) -> Path:
    if (
        agent_path.parent.name == "core"
        and agent_path.parent.parent.name == "files"
        and len(agent_path.parents) >= 3
    ):
        return agent_path.parents[2]
    return fallback


def _run() -> None:
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        payload = {}

    home = Path.home()
    root_hint = _resolve_root(home)
    agent_path = _resolve_agent_path(home, root_hint)
    root = _derive_root(agent_path, root_hint)
    overlay = home / ".alexandria" / "inject" / "session-start.md"
    constitution_derivative = root / "files" / "constitution" / "_constitution.md"
    ontology_derivative = root / "files" / "ontology" / "_ontology.md"

    include_overlay = _env_bool("ALEXANDRIA_INCLUDE_OVERLAY", True)
    include_derivatives = _env_bool("ALEXANDRIA_INCLUDE_DERIVATIVES", True)
    max_chars = max(
        12000, _env_int("ALEXANDRIA_SESSION_CONTEXT_MAX_CHARS", DEFAULT_MAX_CONTEXT_CHARS)
    )

    session_id = str(payload.get("session_id") or "")
    is_bg = payload.get("is_background_agent")
    composer_mode = str(payload.get("composer_mode") or "")
    constitution_status = _derivative_status(
        root / "files" / "constitution", constitution_derivative
    )
    ontology_status = _derivative_status(root / "files" / "ontology", ontology_derivative)

    header = (
        "## Alexandria (Cursor sessionStart)\n\n"
        f"- injected_at: {_utc_now()}\n"
        f"- session_id: {session_id}\n"
        f"- is_background_agent: {is_bg}\n"
        f"- composer_mode: {composer_mode}\n"
        f"- agent_source: {agent_path}\n"
        f"- derivative_status: constitution={constitution_status}, ontology={ontology_status}\n"
        f"- context_budget_chars: {max_chars}\n"
        f"- include_derivatives: {include_derivatives}\n\n"
        "Canon for values and principles. Repo-local CLAUDE.md / AGENTS.md wins on project facts; "
        "this block wins on founder axioms.\n\n---\n\n"
    )

    sections: list[tuple[str, str, bool]] = []
    if agent_path.is_file():
        sections.append(
            ("Founder axioms (`agent.md`)", _read_or_note(agent_path, "Alexandria agent.md"), True)
        )
    else:
        sections.append(
            (
                "Founder axioms (`agent.md`)",
                (
                    f"(Alexandria agent.md not found at `{agent_path}`. "
                    "Set `ALEXANDRIA_ROOT` or clone `~/alexandria`.)\n"
                ),
                True,
            )
        )

    if include_overlay and overlay.is_file():
        sections.append(
            (
                "Session overlay (`~/.alexandria/inject/session-start.md`)",
                _read_or_note(overlay, "session overlay"),
                False,
            )
        )

    if include_derivatives:
        if constitution_derivative.is_file():
            sections.append(
                (
                    "Constitution derivative (`files/constitution/_constitution.md`)",
                    _read_or_note(constitution_derivative, "constitution derivative"),
                    False,
                )
            )
        if ontology_derivative.is_file():
            sections.append(
                (
                    "Ontology derivative (`files/ontology/_ontology.md`)",
                    _read_or_note(ontology_derivative, "ontology derivative"),
                    False,
                )
            )

    required_sections: list[tuple[str, str]] = []
    optional_sections: list[tuple[str, str]] = []
    for title, body, required in sections:
        block = f"## {title}\n\n{body}\n\n---\n\n"
        if required:
            required_sections.append((title, block))
        else:
            optional_sections.append((title, block))

    context_parts: list[str] = [header]
    included_sections: list[str] = []
    truncated_sections: list[str] = []
    skipped_sections: list[str] = []
    used = len(header)

    # Required sections always get first claim on the budget.
    for title, block in required_sections:
        remaining = max_chars - used
        if remaining <= 0:
            skipped_sections.append(title)
            continue
        if len(block) <= remaining:
            context_parts.append(block)
            included_sections.append(title)
            used += len(block)
            continue
        truncated_block, _ = _truncate(block, remaining)
        if truncated_block:
            context_parts.append(truncated_block)
            included_sections.append(title)
            truncated_sections.append(title)
            used += len(truncated_block)
        else:
            skipped_sections.append(title)

    # Optional sections are budgeted fairly so later sections are not starved.
    for idx, (title, block) in enumerate(optional_sections):
        remaining = max_chars - used
        if remaining <= 0:
            skipped_sections.append(title)
            continue
        remaining_optional = len(optional_sections) - idx
        fair_cap = remaining if remaining_optional <= 1 else max(1200, remaining // remaining_optional)
        if len(block) <= fair_cap:
            context_parts.append(block)
            included_sections.append(title)
            used += len(block)
            continue
        truncated_block, was_truncated = _truncate(block, fair_cap)
        if truncated_block:
            context_parts.append(truncated_block)
            included_sections.append(title)
            used += len(truncated_block)
            if was_truncated:
                truncated_sections.append(title)
        else:
            skipped_sections.append(title)

    context = "".join(context_parts)
    timestamp = _utc_now()

    try:
        _append_jsonl(
            home / ".alexandria" / "logs" / "cursor-session-start.jsonl",
            {
                "ts": timestamp,
                "hook": "sessionStart",
                "cursor_project_dir": os.environ.get("CURSOR_PROJECT_DIR"),
                "session_id": session_id,
                "is_background_agent": is_bg,
                "composer_mode": composer_mode,
                "agent_source": str(agent_path),
                "included_sections": included_sections,
                "truncated_sections": truncated_sections,
                "skipped_sections": skipped_sections,
                "include_derivatives": include_derivatives,
                "context_budget_chars": max_chars,
                "context_chars": len(context),
            },
        )
    except OSError:
        # Logging must never block context injection.
        pass

    _emit(
        {
            "env": {
                "ALEXANDRIA_ROOT": str(root),
                "ALEXANDRIA_AGENT_MD": str(agent_path),
                "ALEXANDRIA_CONSTITUTION_DERIVATIVE": str(constitution_derivative),
                "ALEXANDRIA_ONTOLOGY_DERIVATIVE": str(ontology_derivative),
                "ALEXANDRIA_SESSION_ID": session_id,
                "ALEXANDRIA_BACKGROUND": "1" if is_bg else "0",
                "ALEXANDRIA_COMPOSER_MODE": composer_mode,
                "ALEXANDRIA_SESSION_CONTEXT_MAX_CHARS": str(max_chars),
            },
            "additional_context": context,
        }
    )


def main() -> None:
    try:
        _run()
    except Exception:
        traceback.print_exc(file=sys.stderr)
        _emit(
            {
                "additional_context": (
                    "(Alexandria sessionStart hook crashed; stderr has the traceback. "
                    "Load `~/alexandria/files/core/agent.md` manually.)\n"
                ),
                "env": {},
            }
        )


if __name__ == "__main__":
    main()
