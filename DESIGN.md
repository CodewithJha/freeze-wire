# FreezeWire Design System

## Thesis
A continuous provenance story — not a dashboard. External facts become financial decisions along an Evidence Wire.

## Palette (exact)
| Token | Hex | Role |
| --- | --- | --- |
| Background | `#080A0B` | Page void |
| Surface | `#0D1011` | Panels |
| Elevated | `#121617` | Raised controls |
| Primary text | `#F2F0E8` | Body / headlines |
| Secondary text | `#969A96` | Supporting |
| Border | `#242928` | Structural lines |
| Signal | `#D6FF3F` | FREEZE/WIRE accent — sparse |
| Eligible | `#65D391` | Affirmative ledger |
| Restricted | `#FF6B5F` | Access blocked |
| Unknown | `#8B918D` | Unattested |

~80–90% dark/neutral; chartreuse only for active evidence, important actions, verified progression.

## Typography
- **Display (target):** ABC Paloma (Dinamo) — commercial. Until licensed: temporary OFL stand-in **Anybody**, labeled UNVERIFIED in CSS comments and QA report.
- **Mono:** IBM Plex Mono — hashes, addresses, blocks, txIndex, chain IDs, proof metadata.
- **UI/body:** Instrument Sans — restrained companion; not for display hero moments.

Display reserved for: FREEZE/WIRE wordmark, hero statements, major process/state moments, large section headings, RESTRICTED/VERIFIED.

## Motion
- Level-3 on major moments only (proof converge, access boundary, wire draw).
- Level-2 subtle elsewhere.
- No fake scanning %, particles, glow, glass, purple/neon.
- Prefer line draw, node activation, typography movement, fragment converge.
- Honor `prefers-reduced-motion`.

## Experience model
HOOK → EVENT → PROOF → CREDITCOIN → ACCESS, then operable console.
Scroll advances story; real app actions trigger stage completion.
Buttons never claim success early.

## Layout
Full-width stages, large type, asymmetric editorial placement, thin structural lines, strong negative space.
No two-column SaaS dashboard as the primary composition.
