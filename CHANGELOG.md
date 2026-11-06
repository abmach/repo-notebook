# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[Unreleased]: https://gitlab.com/abmach/repo-notebook/-/compare/v0.2.0...HEAD
[0.2.0]: https://gitlab.com/abmach/repo-notebook/-/tree/v0.2.0
[0.1.0]: https://gitlab.com/abmach/repo-notebook/-/tree/v0.1.0
