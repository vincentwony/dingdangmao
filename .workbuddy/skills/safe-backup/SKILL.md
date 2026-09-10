---
name: safe-backup
description: This skill provides a defensive backup workflow that copies files to a timestamped directory and immediately verifies each copy actually landed. It should be used BEFORE any file modification in the project (refactors, config edits, hotfixes, UI restyles) to guarantee a restorable snapshot exists. Triggers include "backup before edit", "make a restore point", "I'm about to change X", or any task that modifies existing code on disk.
agent_created: true
---

# Safe Backup (防御性备份)

## Purpose

Guarantee that every file modification in this project has a verified, restorable snapshot. The tool copies each target to `H:/Phone/Back/safe_<TIMESTAMP>/` and **immediately re-checks that the copy exists** — any missing copy aborts with a non-zero exit, so "thought I backed up but didn't" can never happen again.

## When to use

- Before editing any tracked source file (`.js`, `.css`, `.html`, `.mjs`).
- Before a refactor, restyle, or hotfix touching files that have no git history (this repo is **not** a git repository — backups are the only rollback mechanism).
- As the first step of any task the user frames as "risky", "might break", or "keep a copy just in case".

## How to use

Run the bundled script with one or more file paths:

```bash
bash <skill_dir>/scripts/safe-backup H:/Phone/web/js/app.js H:/Phone/web/css/layout.css
```

The script:
1. Creates `H:/Phone/Back/safe_YYYYMMDD_HHMMSS/`.
2. Copies each file there as `<basename>.<TIMESTAMP>.bak`.
3. After each copy, `ls`-checks the `.bak` exists; if any is missing it prints `备份失败(未落地)` and exits `1`.
4. On success prints `全部备份完成(N 个): <dir>`.

Always confirm the final `全部备份完成` line and the per-file `已备份:` lines before proceeding with edits.

## Hard rules (teach the team these)

- **Backup before edit, always.** No exception, even for "tiny" one-line changes.
- **Verify after copy.** A `cp` with no follow-up check is worthless — silent misses are how rollbacks fail.
- **One task = one timestamped bundle.** Never scatter `.bak` files by hand into random folders; use this script so every snapshot is self-contained and dated.

## Reference

- Bundled script: `scripts/safe-backup` (identical to the project tool `H:/Phone/tools/safe-backup`).
- Restore: copy the `.bak` back over the live file, or read it to diff.
