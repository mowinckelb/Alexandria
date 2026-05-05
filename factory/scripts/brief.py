#!/usr/bin/env python3
"""Daily brief sender — reads ~/alexandria/system/.brief_outbox (one line of
text written by whatever produced today's content: an autoloop, a skill, or
a manual edit) and SMTP-sends it. Falls back to a default line when the
outbox is empty or absent.

Sovereign by construction: no network calls except to the user's chosen SMTP
provider. No Alexandria-server dependency. If alexandria.* domains vanish,
this keeps working as long as the user's email provider keeps speaking SMTP.
"""

import json
import smtplib
import ssl
import sys
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path

ALEX = Path.home() / "alexandria" / "system"
CREDS = ALEX / ".brief_email"
OUTBOX = ALEX / ".brief_outbox"
LOG = ALEX / ".brief_log"

DEFAULT_BODY = "no material change overnight."


def log(line: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with LOG.open("a") as f:
        f.write(f"{ts} {line}\n")


def main() -> int:
    if not CREDS.exists():
        log(f"abort: creds missing at {CREDS} — run /brief-setup")
        return 1

    try:
        creds = json.loads(CREDS.read_text())
    except Exception as e:
        log(f"abort: creds unreadable ({type(e).__name__}: {e})")
        return 1

    body = DEFAULT_BODY
    if OUTBOX.exists():
        text = OUTBOX.read_text().strip()
        if text:
            body = text
        OUTBOX.unlink()  # consume — outbox is single-shot

    msg = EmailMessage()
    msg["Subject"] = creds.get("subject", "alexandria.")
    msg["From"] = creds["from"]
    msg["To"] = creds["to"]
    msg.set_content(body)

    try:
        ctx = ssl.create_default_context()
        port = int(creds.get("port", 465))
        if port == 465:
            with smtplib.SMTP_SSL(creds["host"], port, context=ctx, timeout=20) as srv:
                srv.login(creds["user"], creds["password"])
                srv.send_message(msg)
        else:
            with smtplib.SMTP(creds["host"], port, timeout=20) as srv:
                srv.starttls(context=ctx)
                srv.login(creds["user"], creds["password"])
                srv.send_message(msg)
        log(f"sent: {body[:80]}")
        return 0
    except Exception as e:
        log(f"fail: {type(e).__name__}: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
