# Alexandria Setup

## 1. Connect

**Claude:** Claude.ai → Settings → Connectors → paste this URL → authorize Google (click "Continue" past the unverified app warning)

```
https://alexandria-production-7db3.up.railway.app/mcp
```

**ChatGPT:** Coming soon.

## 2. Add memory edits

Go to Settings → Memory → add these as THREE separate entries. (If memory editing isn't unlocked yet, have a few conversations first — it unlocks automatically.)

**Edit 1:**

MANDATORY FIRST ACTION every conversation: call Alexandria read_constitution(domain='all') BEFORE generating any response. No exceptions regardless of query type or complexity. Trigger words: hey, hi, hello, alexandria, hey alexandria, hey claude, hi claude, or any greeting.

**Edit 2:**

Alexandria is this user's sovereign cognitive identity layer storing their complete cognitive profile — preferences, values, interests, personality, and personal context. During conversations: use update_constitution to capture signals about who they are (default vault target). When they say 'alexandria' or 'hey alexandria', call activate_mode. Use log_feedback to record what works and what doesn't.

**Edit 3:**

When this user says bye, goodbye, thanks, done, bye alexandria, bye claude, or the conversation seems to be concluding: call update_constitution with target 'vault' to capture ALL signals observed during the conversation — preferences, opinions, decisions, patterns, values, topics they care about. One comprehensive capture. Do not skip this.

## 3. Use it

**Start a conversation:** Say "hey alexandria" or just "hey" — it loads your profile.

**During:** Just talk normally. Alexandria quietly picks up on who you are — what you care about, how you think, what you like.

**End a conversation:** Say "bye alexandria" or "bye" or "thanks" or "done" — it saves everything it learned to your Google Drive.

That's it. Every conversation makes it smarter about you.

## Troubleshooting

**"Alexandria isn't loading my profile"**
- Check the connector is still active: Settings → Connectors → should show Alexandria as connected
- Try saying "hey alexandria" explicitly — some greetings don't trigger it

**"I don't see memory editing in Settings"**
- Have a few more conversations. Claude unlocks memory editing after some usage. Check back in a day.

**"Google authorization failed"**
- The app shows an "unverified" warning — that's normal. Click "Continue" to proceed.
- If it still fails, try a different browser or clear cookies and retry.

**"My profile feels wrong or outdated"**
- Say "alexandria, read my constitution" to see what it currently knows
- You can correct it: "alexandria, I actually prefer X over Y" — it updates

**"I want to start fresh"**
- Your file is on your Google Drive. You can read, edit, or delete it directly. Alexandria never stores a copy.

## Where your data lives

Your cognitive profile is a file on **your** Google Drive. Alexandria has no database. There is literally nowhere on our system for your data to exist. We can't see it, we can't access it, we don't store it. The connection is a pipe — nothing sticks to it.

You own the file. You can read it, edit it, move it, delete it. It's yours.
