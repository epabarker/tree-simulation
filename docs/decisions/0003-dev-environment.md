# 0003: Development environment

- **Status:** accepted
- **Date:** 2026-10-26

## Context

Claude Code first ran inside the VSCodium Flatpak sandbox, which hid host tools: no Node, and gh and uv only on the host. The user prefers native tools over sandboxes.

## Decision

- **Editor:** native Microsoft VS Code (RPM) on Fedora 44.
- **Toolchain,** installed through the user's `~/dotfiles/setup/root.sh` (dnf, with snapper snapshots around every transaction):
  - Node 24 LTS (`nodejs24*`; Fedora's default `nodejs` is 22);
  - npm, gh, uv.
- **Python analysis:** a uv project in `analysis/` using the system Python 3.14 (`analysis/.python-version`). Fedora's uv is set not to download Python itself.
- **R:** deferred until needed (`sudo dnf install R`).
- **CI** uses the same Node major via `.node-version`.

## Consequences

- Claude Code and the integrated terminal see the host toolchain directly.
- Versions come from Fedora updates rather than a per-project version manager. CI pins the Node major, so drift is limited to minor versions.
- The project folder lives under `~/Documents/Projects`, which the user's `pcloud-sync` syncs to pCloud hourly. Its filters already skip `.git`, `node_modules` and `.venv`; whether to skip `runs/` and `dist/` is an open question in STATUS.
