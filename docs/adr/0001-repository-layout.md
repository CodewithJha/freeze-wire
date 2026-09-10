# ADR-0001: Repository layout

- Status: Accepted (Amended 2026-09-10)
- Date: 2026-09-10

## Context

**Original (no longer current architecture):** The Cursor workspace was the Kaggriculture git directory. Git had no commits. A nested `freeze-wire/.git` would confuse status and risk committing the wrong tree.

**Current:** FreezeWire lives at the FreezeWire repository root. It is an independent standalone Git repository with its own history (extracted via `git subtree split -P freeze-wire` from the Kaggriculture tree that had tracked FreezeWire files). Kaggriculture remains a separate project at the Kaggriculture project directory and is not modified by FreezeWire work. FreezeWire is not nested inside Kaggriculture. Kaggriculture’s working tree no longer contains `freeze-wire/`.

## Original decision (superseded as current layout)

Keep FreezeWire as `kaggriculture/freeze-wire/`. Use the existing Kaggriculture git. Commit **only** `freeze-wire/` files. Do not nest a second git repo.

## Amended decision

- FreezeWire is a **standalone repository** at the FreezeWire repository root.
- It has **its own Git history** at this directory root (`.git` here is FreezeWire’s, not Kaggriculture’s).
- It does **not** use Kaggriculture’s Git.
- Kaggriculture remains a separate, untouched project.
- A dedicated remote (GitHub) is a **separate future decision**. This ADR does **not** claim a remote exists.

## Consequences

- Commits in this repo are FreezeWire-only by construction.
- Do not modify Kaggriculture files from FreezeWire work.
- Do not nest another `.git` inside this repository.
- Adding `origin` or any public remote is not decided here.
