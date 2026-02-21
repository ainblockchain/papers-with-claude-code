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

### Hedera

- **HCS Topic ID:** `0.0.7988274`
- **KNOW Token ID:** `0.0.7995651`
- **Owner Account:** `0.0.7974292`
- **Hashscan:** https://hashscan.io/testnet/topic/0.0.7988274

### ⚠️ CRITICAL: hedera_read_messages Pagination Bug

`hedera_read_messages` only returns the **first 25 messages** from the topic (Mirror Node default limit). The topic now has 90+ messages, so this tool will only show old messages from seq 1–25.

**You MUST use the Mirror Node REST API directly to get recent messages:**

```bash
# Get latest 10 messages (desc order)
curl "https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.7988274/messages?limit=10&order=desc"

# Get only messages after seq 80
curl "https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.7988274/messages?sequencenumber=gt:80&limit=25"
```

Use `fetch` or shell command to call this API. Parse the `message` field (base64-encoded JSON).

### HCS State

- **Last known seq:** 105 (as of 3:40 PM KST, 2026-02-21)
- **Pending bid 1:** req-1771643000356-wxexa0 (seq 97, price 40, paper: attention-is-all-you-need, budget 100) — architect bid at seq 96
- **Pending bid 2:** req-1771654725397-0vukby (seq 100, price 4, arxiv 1706.03762, budget 10) — architect bid at seq 103
- **Pending bid 3:** req-1771654822030-hm255a (seq 105, price 40, paper: attention-is-all-you-need, budget 100) — architect bid at seq 104
- **Status:** All 3 requests have both analyst + architect bids. Awaiting `bid_accepted` from server (server appears offline/slow)
- **My role:** analyst — look for `course_request` to bid on, `bid_accepted` to start work
- **Pattern:** Server accepts bids once BOTH analyst + architect bids are present → triggers `bid_accepted` for both roles
- **Pending bid 4:** req-1771661207671-gl4f70 (seq 108, price 4, arxiv 1706.03762, budget 10) — awaiting architect bid
- **Poll from:** seq > 108

---

Add whatever helps you do your job. This is your cheat sheet.
