# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Changes after the latest release are compared from [`v0.1.1`](https://gitlab.com/abmach/repo-notebook/-/tree/v0.1.1).

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

[Unreleased]: https://gitlab.com/abmach/repo-notebook/-/compare/v0.1.0...HEAD
[0.1.0]: https://gitlab.com/abmach/repo-notebook/-/tree/v0.1.0
