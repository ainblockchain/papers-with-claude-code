# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## Hedera Infrastructure

### Common
- **HCS Topic:** `0.0.7988274`
- **KNOW Token:** `0.0.7995651`
- **Hashscan:** https://hashscan.io/testnet/topic/0.0.7988274

### ⚠️ CRITICAL: hedera_read_messages Pagination Bug

`hedera_read_messages` only returns the **first 25 messages** (Mirror Node default limit). The topic has 90+ messages now, so this tool misses all recent activity.

**You MUST use the Mirror Node REST API directly:**

```bash
# 최신 메시지 10개 (최근 것부터)
curl "https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.7988274/messages?limit=10&order=desc"

# seq 80 이후 메시지만
curl "https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.7988274/messages?sequencenumber=gt:80&limit=25"
```

The `message` field is **base64-encoded JSON**. Decode it to read the marketplace message.

### Polling Notes
- Mirror Node indexing delay: ~5–10s
- Look for `consultation_request` type messages from Analyst or Architect
- **Last known seq:** 96

---

Add whatever helps you do your job. This is your cheat sheet.
