---
name: brief-setup
description: One-time setup for the daily morning brief — local launchd schedule + user-owned SMTP credentials. Sovereign by construction; survives Alexandria the company vanishing.
---

You are setting up the Author's daily morning brief delivery. This is a ONE-TIME interactive setup. After it completes, the brief sends itself daily from the Author's machine via their own SMTP credentials, with no dependency on alexandria.* infrastructure.

## What you're building

- `~/alexandria/system/.brief_email` — JSON: SMTP creds (host, port, user, password, from, to, subject). Mode 600. Lives only on this machine.
- `~/alexandria/system/brief.py` — copied from `factory/scripts/brief.py` in the public alexandria repo. The daily sender.
- `~/Library/LaunchAgents/com.alexandria.brief.plist` — launchd schedule, fires `brief.py` daily at the Author's chosen local time.

`brief.py` reads `~/alexandria/system/.brief_outbox` (one line of text — written by the autoloop or any other producer) and SMTP-sends it. Empty / missing outbox → default `"no material change overnight."`

## Steps

### 1. Email address

Ask the Author what email they want briefs sent to. Default offer: their git config `user.email` or their gh login email. They'll usually want both `from` and `to` to be the same address (sending from themselves to themselves).

### 2. Provider detection + app password

Look at the email's domain and produce provider-specific SMTP setup instructions. Don't hardcode a list — read the domain, name the provider you recognize, and walk them through the canonical flow. Common cases:

- `@icloud.com` / `@me.com` / `@mac.com` / Apple-managed custom domain → SMTP host `smtp.mail.me.com`, port `587` (STARTTLS), user is the full email, password is an app-specific password generated at appleid.apple.com → Sign-In and Security → App-Specific Passwords. Walk them through generating one named `alexandria-brief`.
- `@gmail.com` (or Google Workspace) → SMTP host `smtp.gmail.com`, port `465` (SSL), user is the full email, password is an app password generated at myaccount.google.com → Security → 2-Step Verification → App passwords. Requires 2-step verification enabled first. Walk them through.
- `@proton.me` / `@protonmail.com` → SMTP via Proton Bridge (paid plan) or Proton's SMTP submission for paid plans. Host `smtp.protonmail.ch`, port `587`. Walk them through generating an SMTP token in their Proton settings.
- Fastmail, Zoho, Outlook/Hotmail, custom domains, etc. → identify the provider, fetch their canonical SMTP + app-password instructions if you have web access; otherwise tell the Author the parameters you need (host, port, user, password) and let them look up their provider's docs.

The Author pastes the app password back to you. Treat it as sensitive — never echo it to logs, never put it in commits.

### 3. Write credentials file

Save to `~/alexandria/system/.brief_email` as JSON:

```json
{
  "host": "<smtp host>",
  "port": <587 or 465>,
  "user": "<email address>",
  "password": "<app password>",
  "from": "<email address>",
  "to": "<email address>",
  "subject": "alexandria."
}
```

`chmod 600` immediately. The password is plaintext on disk — that's the same trust level as their email password, gated by their machine's user account.

### 4. Install the daily script

Copy `factory/scripts/brief.py` from the public alexandria repo to `~/alexandria/system/brief.py`. Make executable.

```bash
curl -sf https://raw.githubusercontent.com/mowinckelb/alexandria/main/factory/scripts/brief.py \
  -o ~/alexandria/system/brief.py
chmod +x ~/alexandria/system/brief.py
```

### 5. Schedule via launchd

Ask the Author what local time they want the brief (default 08:00). Write `~/Library/LaunchAgents/com.alexandria.brief.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>           <string>com.alexandria.brief</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>{HOME}/alexandria/system/brief.py</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>   <integer>{HOUR}</integer>
    <key>Minute</key> <integer>{MINUTE}</integer>
  </dict>
  <key>StandardOutPath</key> <string>{HOME}/alexandria/system/.brief_log</string>
  <key>StandardErrorPath</key> <string>{HOME}/alexandria/system/.brief_log</string>
</dict>
</plist>
```

Substitute the Author's `$HOME` and chosen time. Then load:

```bash
launchctl unload ~/Library/LaunchAgents/com.alexandria.brief.plist 2>/dev/null
launchctl load ~/Library/LaunchAgents/com.alexandria.brief.plist
```

`StartCalendarInterval` uses the machine's local time and catches up after sleep — closing the laptop overnight is fine.

### 6. Verify with a test email

Run the script once immediately so the Author sees a test email land within seconds:

```bash
python3 ~/alexandria/system/brief.py
```

Then read `~/alexandria/system/.brief_log` — confirm the last line is `sent: ...` not `fail: ...`. If it's `fail`, surface the error to the Author and walk back through the offending step (usually wrong app password or SMTP host).

If it's `sent`, ask the Author to check their inbox. If the test email landed, the loop is closed. Tell them the next brief will fire at their scheduled time tomorrow, and that any process can write to `~/alexandria/system/.brief_outbox` (one line) to override the default body.

## Sovereignty test

After setup is complete, every piece of the brief delivery loop lives on the Author's machine:

- `~/alexandria/system/.brief_email` (their SMTP creds, against their email provider)
- `~/alexandria/system/brief.py` (the script)
- `~/Library/LaunchAgents/com.alexandria.brief.plist` (their launchd schedule)
- `~/alexandria/system/.brief_outbox` (their content source — written by their own autoloop or whatever)

If alexandria the company shuts down tomorrow, none of this stops working. The Author's brief keeps arriving in their inbox forever, until they delete the launchd plist themselves.
