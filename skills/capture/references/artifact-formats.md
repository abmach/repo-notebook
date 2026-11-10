# Durable artifact formats

## Context

`.repo-notebook/context.md` describes the project's purpose, scope, important areas, and relationships.

```markdown
# Project Context

## Purpose

<Why the project exists and the outcome it serves.>

## Scope

- <included boundary>
- <excluded boundary>

## Architecture and relationships

- **<Area or component>** — <responsibility and relationship to other areas>
```

## Glossary

`.repo-notebook/glossary.md` defines canonical project vocabulary.

```markdown
# Glossary

## <Context or area>

**Canonical term**:
<One or two-sentence definition.>
_Avoid_: <discouraged alias, alternative name>
```

Use only project-specific terms. Prefer one canonical term. Do not put implementation instructions here.

## Principles

`.repo-notebook/principles.md` contains short, load-bearing rules.

```markdown
# Principles

1. **<Rule>** — <why it matters>. <Source: decision NNNN or user-confirmed constraint>
```

A rule must change how future work is done. Do not include style preferences that the repository already communicates unambiguously.

## Decisions

Store durable choices at `.repo-notebook/decisions/NNNN-<slug>.md`.

```markdown
---
id: NNNN
status: accepted
significance: durable | architectural
date: YYYY-MM-DD
---

# <Decision title>

## Context

<Why a decision was needed.>

## Decision

<What was chosen.>

## Rationale

<Why it was chosen. Mark any inference.>

## Alternatives considered

- <Alternative> — <why it was not chosen>

## Consequences

- <Positive or negative consequence>
```

Before creating a decision, list all existing decision IDs and allocate the next unused sequential ID using the existing padding width. Never reuse an ID, including IDs of deprecated or superseded records. The `id` field and filename prefix must match exactly. If that filename exists, allocate a different ID or slug rather than overwrite it.

Use `status: proposed`, `accepted`, `deprecated`, or `superseded`. `accepted` is the only authoritative decision status. `proposed` is non-binding and must not be cited as established project guidance. `deprecated` means no longer recommended and not replaced. `superseded` means replaced by another accepted decision and requires `superseded_by: NNNN` in the front matter.

If evidence does not support a required decision section, write `Not recorded` rather than inventing content or omitting the section. Do not fabricate alternatives. An inference may be included only when explicitly labeled as an inference and does not substitute for missing evidence.

`significance: architectural` is appropriate when the choice shapes system boundaries, major dependencies, data ownership, or long-lived direction. Other future-relevant choices use `significance: durable`.

## Current system behavior

`.repo-notebook/system.md` describes what the shipped system does today.

```markdown
# System Behavior

## <Capability or domain>

- <Observable behavior or contract>

_Rewritten in place when behavior changes; decisions retain the history._
```

Describe current capabilities and contracts, not implementation detail or rationale.

## Current technical choices

`.repo-notebook/stack.md` describes the current project stack and architecture.

```markdown
# Technical Choices

## <Category>

- **<Choice>** — <version or specificity where useful>

## Architecture

- <Component, boundary, or relationship>
```

Record current truth. Put the reason for a consequential choice in `decisions/`.

## Index

`.repo-notebook/index.md` is a directory-level map, not a second index of record contents. Include one link and a one-line purpose for each existing top-level durable artifact and `work/`; represent decisions through `decisions/` rather than individual decisions. Update it when a mapped path or purpose is missing or stale. Ordinary content changes do not require an index change unless the existing one-line purpose becomes inaccurate.
