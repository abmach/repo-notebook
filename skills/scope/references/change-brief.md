# Change Brief format

A Change Brief captures shared understanding while scope is being shaped or implemented. It lives at `.repo-notebook/work/<descriptive-kebab-case-name>.md`.

```markdown
# <Feature or bug title>

## Purpose

Why this change exists and the outcome it should produce.

## Scope

- <included behavior, change, or boundary>

## Non-goals

- <explicitly excluded work>

## Change points

- **<Area or contract>** — <expected consequence>

## Acceptance

- <observable condition that establishes completion>

## Assumptions

- <unconfirmed assumption, or omit this section when empty>

## Open questions

- <unresolved question, or "None">

## Decisions

- <durable choice made while shaping this work, with a link when captured>

## Outcome

<Final scope and the durable context records produced by the work.>
```

## Rules

- Use only sections that carry useful information; omit `Non-goals`, `Assumptions`, `Open questions`, or `Decisions` when empty and not yet needed.
- Put only unconfirmed assumptions in `Assumptions`; do not state them as agreed scope. Resolve or remove every assumption before settlement.
- State acceptance as observable outcomes, not implementation steps.
- Keep acceptance synchronized with the agreed behavior whenever scope changes.
- Record change points, not tasks.
- Keep implementation detail in the repository and current task, not in the brief.
- Record a durable decision here only as a link to its canonical decision record once captured; do not maintain a second copy.
- `Outcome` is settlement-only. Omit it while the brief is active and write it only after acceptance passes, immediately before applying the promotion and removal steps.
- Keep the brief transient. When work settles, promote durable consequences and remove the brief.
