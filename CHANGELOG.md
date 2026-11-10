# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-11-10

### Added

- The installer now records packaged skill-file hashes and upgrades packaged files when their installed contents still match the previously packaged hash. Locally modified files are preserved and reported; the explicit `--replace-skills` option replaces differing files deliberately.

### Changed

- Bootstrap refreshes now preserve pre-existing notebook files and directories unless deletion is explicitly proposed and approved. Empty or skipped artifacts are not treated as permission to delete them.
- Settling a Change Brief removes only the brief file and preserves the `.repo-notebook/work/` directory.
- Capture and context workflows now require explicit per-update approval, deterministic artifact ownership, existing-record inspection, atomic dependent updates, and verification-backed current-behavior claims.
- Scope settlement now waits for verified acceptance, resolved questions and assumptions, and successfully applied durable updates; briefs remain unique and synchronized with their change.

## [0.2.2] - 2026-11-07

### Fixed

- Removed the inaccurate `q`/Esc cancel-key advertising; TTY prompts advertise Ctrl+C only (the actual Inquirer exit key), and the fallback prompts were restored to the original `[Y/n]` / `[none]` text.
- CI validation now runs `bun install --frozen-lockfile` before `bun run validate`, so the `@inquirer/prompts` regression test can resolve the dependency on GitLab runners.

## [0.2.1] - 2026-11-07

### Fixed

- Location selector now starts with no locations selected; users opt into each harness location explicitly.
- TTY prompts advertise the cancellation key (Ctrl+C), and the fallback flow accepts `cancel`/`q`/`esc`/`back` anywhere, cancelling with `Installation cancelled. Nothing was installed.` and without writing anything.
- Fixed a runtime crash in the TTY path where `multiselect` was destructured from `@inquirer/prompts` — it is not an export; the code now uses `checkbox`, with a regression test asserting every destructured prompt name resolves to a real function.

## [0.2.0] - 2026-11-07

### Added

- Interactive terminal UI for `repo-notebook init` built on `@inquirer/prompts`: arrow-key multiselect for harness locations (with sensible preselection), per-file checkbox for instruction targets, a final summary + confirmation gate, and an install spinner on stderr.
- `lib/prompts.js` prompt adapter keeps the original readline questions for piped/non-TTY runs so CI and scripted usage see byte-identical text and behavior.

## [0.1.1] - 2026-11-06

### Changed

- Installer defaults are now adoption-first: notebook creation, always-read instruction installation, and final confirmation default to yes.
- Validation and tests now run from Bun while keeping npm for registry operations.


## [0.1.0] - 2026-11-06

### Added

- `context`, `scope`, `capture`, and `bootstrap` Agent Skills for durable project context and collaborative scoping.
- Consent-aware `repo-notebook init` installer for supported harness locations.
- Project notebook templates for context, glossary, principles, decisions, current behavior, technical choices, and transient Change Briefs.
- Automated skill, package-contract, and installer validation.

[Unreleased]: https://gitlab.com/abmach/repo-notebook/-/compare/v0.3.0...HEAD
[0.3.0]: https://gitlab.com/abmach/repo-notebook/-/compare/v0.2.2...v0.3.0
[0.2.2]: https://gitlab.com/abmach/repo-notebook/-/tree/v0.2.2
[0.2.1]: https://gitlab.com/abmach/repo-notebook/-/tree/v0.2.1
[0.2.0]: https://gitlab.com/abmach/repo-notebook/-/tree/v0.2.0
