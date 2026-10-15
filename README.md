# FunBun

A minimalistic CLI to-do app for people who want to manage tasks with the least possible keystrokes.

> **Vibe-coded warning:** The functionality was designed by a human, but the code was generated with AI assistance. This may manifest in unexpected ways, especially in environments different from the author's (macOS, zsh, Bun). Treat it as a starting point, not production software.

## What this is

An opinionated, single-user to-do system that uses:
- Plain Markdown files (one line = one task)
- A Bun/TypeScript script for manipulation
- Single-letter shell aliases for speed

This tool works for one person. It reflects specific workflows and preferences. It is not designed to be configurable or to satisfy everyone.

## Quick look

```
a           → show active tasks
b           → show backlog
a fix the thing → add task to active
c 3         → mark task 3 as complete
s           → show stats and streak
```

## Requirements

- [Bun](https://bun.sh) installed
- zsh or bash

## Setup

```bash
bun fun.ts init
```

This creates the task files and adds aliases to your shell config.

## File structure

| File | Purpose |
|------|---------|
| a.md | Active tasks (today) |
| b.md | Backlog |
| c.md | Completed tasks |
| d.md | Deleted tasks |
| e.md | Goals ("ends") |
| spec.md | Detailed specification |

## Commands

| Alias | Action |
|-------|--------|
| `a` | Show active tasks |
| `b` | Show backlog |
| `c` | Show completed |
| `d` | Show deleted |
| `e` | Show goals |
| `fa` `fb` `fc` `fd` `fe` | Edit file in vim |
| `a <title>` | Add task to active |
| `b <title>` | Add task to backlog |
| `e <title>` | Add goal |
| `c <n>` | Complete task n |
| `d <n>` | Delete task n |
| `s` | Show stats |
| `s <n>` | Decompose task n into subtasks |
| `r` | Refresh (clear completed from active) |

## Forking this

This is a personal tool shared as-is. If you want to adapt it, here are known limitations you might address:

- **Line number fragility** — Task IDs are line numbers; any modification shifts them. Consider stable IDs.
- **Alias collisions** — Single letters (`r`, `s`, `c`, `d`) may conflict with other tools. Consider a prefix like `t` for task.
- **No undo** — Mistakes require manual file editing.
- **Overloaded commands** — `s` means stats or decompose; `c` means show or complete. Could be confusing.
- **Shell detection** — Assumes `.zshrc`/`.bashrc`; some systems use `.zprofile` or `.bash_profile`.
- **Timezone handling** — "Today" calculations may behave unexpectedly across timezones.
- **No confirmation prompts** — Destructive actions happen immediately.

## License

Do whatever you want with it.
