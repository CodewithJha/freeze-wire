# Packaging checklist

> **Potentially packaging-only.** Hosting / metadata checklist for publishing project materials (deck, whitepaper, demo). Kept for reference; not required as core product documentation.

**Paste-ready copy:** `01-project-fields.md`.

---

## A. MATERIALS TO ASSEMBLE

- [ ] **Project Name:** FreezeWire
- [ ] **Project Sector:** DeFi
- [ ] **Project Description:** paste from `01-project-fields.md`
- [ ] **Attestcoin Protocol Integration Summary:** paste from `01-project-fields.md`
- [ ] **GitHub Repository URL:** https://github.com/CodewithJha/freeze-wire  
  - [ ] Confirm README visible on `master`
- [ ] **Project Deck or Whitepaper — PDF URL:** (after hosting)
- [ ] **Prototype Demo Video URL:** (after hosting)
- [ ] Working Attestcoin integration + technical docs (satisfied by public repo — no engineering change)
- [ ] Testnet deploy (satisfied by CC3 evidence — no redeploy)

---

## B. OPTIONAL

- [ ] Project Logo (PNG/SVG/AI **URL**)
- [ ] Telegram ID
- [ ] X / Twitter
- [ ] LinkedIn
- [ ] Resume (PDF URL)
- [ ] Live frontend URL — optional polish

---

## C. MATERIALS TO HOST FIRST

| Material | Source | Host as | Typical use |
|---|---|---|---|
| Pitch deck PDF | Export `02-pitch-deck.md` | Public **PDF URL** | Deck or whitepaper link |
| Whitepaper PDF | `FreezeWire_Whitepaper.pdf` | Public **PDF URL** | Deck or whitepaper link |
| Demo video | Record `03-demo-video-script.md` | Public video URL (YouTube/Loom/etc.) | Demo link |
| Logo (optional) | New asset if desired | PNG/SVG/AI URL | Logo |
| Resume (optional) | Your PDF | PDF URL | Resume |

**Do not** commit private keys or `.env` into hosting.

---

## D. PERSONAL METADATA (if needed for a bio/contact block)

These require your identity — not filled by tooling:

- [ ] Legal first & last name
- [ ] Email you monitor
- [ ] Country of residence
- [ ] Country of citizenship
- [ ] Final bio polish / role confirmation
- [ ] Optional socials / resume / logo decisions
- [ ] Upload + paste **PDF URL** and **video URL**

---

## E. PRE-PUBLISH CHECK

Before sharing materials publicly:

1. [ ] Sector shows **DeFi**
2. [ ] GitHub opens and README loads
3. [ ] Attestcoin Integration Summary is **non-empty** and mentions `0x0FD2`, chainKey `3`, no `setStatus`
4. [ ] PDF URL returns a PDF (not a private Drive “request access” page)
5. [ ] Video URL plays without login wall if possible
6. [ ] Name / email / bio / role filled where you intend to share them
7. [ ] No secrets pasted into any public field or page
8. [ ] Reload hosted links and confirm FreezeWire materials appear as expected

---

## Quick paste values (reminder)

| Field | Value |
|---|---|
| Name | FreezeWire |
| Sector | DeFi |
| GitHub | https://github.com/CodewithJha/freeze-wire |
| PDF | *(host first — `FreezeWire_Whitepaper.pdf` or deck)* |
| Video | *(record + host first)* |
