# Whitepaper build notes

## Artifacts

| File | Role |
|---|---|
| `../FreezeWire_Whitepaper.pdf` | Primary PDF artifact |
| `../FreezeWire_Whitepaper.md` | Editable summary source |
| `whitepaper.html` | Full styled HTML used to print the PDF |
| `assets/frontend-hero.png` | Public FE screenshot (2026-09-13) |
| `assets/*.ttf` + `*.css` | Local fonts for offline Chrome print |

## Verified at generation (2026-09-13)

- Foundry: 95 passed / 1 skipped
- Backend: 46 passed
- Frontend Vitest: 17 passed
- Frontend build: PASS
- Public FE/BE/CORS/explorers/status/RELAY_DISABLED: live checks OK
- PDF: 13 pages, dark premium `#D6FF3F`, hyperlinks present
- Safe margins ~9.5% L/R · ~6–7.5% T/B; page numbers `NN / 13`

## Non-goals

No application/contract/deployment code changes. No secrets.
