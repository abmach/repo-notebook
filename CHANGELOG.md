# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.2] - 2026-11-13

### Added

- Prompt-stream tests drive the real `@inquirer/prompts` `checkbox`/`confirm` through `@inquirer/testing` with scripted keystrokes, so the TTY adapter's selection logic is verified deterministically without a terminal. `createUi` accepts an injected `prompts` module for this.


## [0.5.1] - 2026-11-13

### Fixed

- `check` is markdown-fence aware: a heading or numbered rule inside a fenced code block no longer satisfies or trips `E007`/`E008`. A `system.md` with only an example heading now fails correctly, and an example principle in a fence no longer false-positives.
- `check` no longer false-positives on valid index links: `./context.md` and `context.md#anchor` now count as linking the artifact, and a dangling `./`-prefixed link is still reported.
- `check` detects principles numbered `1)` as well as `1.`, so a rule with no `Source:` cannot slip through on an alternate list style.
- `check` rejects unknown flags and positional arguments instead of silently ignoring them (a typo like `--jsn` no longer runs as a plain check).
- `validate:package` verifies `lib/checker.js` and the notebook templates are in the tarball, and no longer depends on a machine-specific npm path (works under Bun and Node, and via PATH).

## [0.5.0] - 2026-11-13

### Added

- `check` validates the notebook's own format, not only `decisions/`: required top-level headings per artifact (`E007`), principle provenance (`E008`, every numbered rule must carry `Source:`), and index integrity (`W003` unlinked top-level artifact, `W004` dangling `index.md` link). The notebook template now links `work/` so a fresh install passes.

### Changed

- Bootstrap refresh and context reconciliation end by running `repo-notebook check`; a structural error is folded into a further proposal rather than reported as complete.

## [0.4.0] - 2026-11-12

### Added

- `repo-notebook check` lints a notebook's decision structure: an absent notebook, duplicate IDs (including IDs differing only by zero-padding), `id`/filename mismatches, dangling or incomplete `superseded_by`, and invalid status or missing id. It is read-only, checks only mechanically decidable invariants, supports `--json` and `--strict`, and exits nonzero on error so CI or a harness can gate on it.
- `repo-notebook check --fix` applies the mechanical corrections (align `id:` to the filename prefix, renumber duplicate IDs) and leaves record bodies untouched.
- `check` reports `S001` stale candidates: a superseded decision whose title terms still appear in `system.md` or `stack.md`. These are report-only review prompts, never pass/fail.

### Fixed

- Capture now requires superseding an owning decision when a current-truth artifact changes, instead of amending the artifact while leaving a contradicting `accepted` decision in place.
- Decision IDs are allocated at write time by re-enumerating `decisions/`, so an ID proposed in an earlier turn is not reused.
- Context consultation must enumerate `decisions/` and read overlapping `accepted` records before any change that touches current truth, and the reconcile output must include a `Decisions consulted:` line, so a missing decision read is visible rather than silent.

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

[Unreleased]: https://gitlab.com/abmach/repo-notebook/-/compare/v0.5.2...HEAD
[0.5.2]: https://gitlab.com/abmach/repo-notebook/-/compare/v0.5.1...v0.5.2
[0.5.1]: https://gitlab.com/abmach/repo-notebook/-/compare/v0.5.0...v0.5.1
[0.5.0]: https://gitlab.com/abmach/repo-notebook/-/compare/v0.4.0...v0.5.0
[0.4.0]: https://gitlab.com/abmach/repo-notebook/-/compare/v0.3.0...v0.4.0
[0.3.0]: https://gitlab.com/abmach/repo-notebook/-/compare/v0.2.2...v0.3.0
[0.2.2]: https://gitlab.com/abmach/repo-notebook/-/tree/v0.2.2
[0.2.1]: https://gitlab.com/abmach/repo-notebook/-/tree/v0.2.1
[0.2.0]: https://gitlab.com/abmach/repo-notebook/-/tree/v0.2.0
