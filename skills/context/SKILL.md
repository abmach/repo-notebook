---
name: context
description: Use this skill when a project's Repo Notebook instruction directs you to consult durable context before work or reconcile the implementation with project truth afterward. It reads principles, glossary, decisions, current behavior, technical choices, and active Change Briefs, then surfaces conflicts and offers specific context updates.
license: MIT
---

# Project context

Use the repository's committed `.repo-notebook/` as curated project truth. Do not duplicate its content in the conversation and do not silently change it.

## Resolve the notebook

1. Resolve the project root. Prefer the Git repository root; otherwise use the current working directory.
2. Read `.repo-notebook/index.md` when it exists.
3. Read only the relevant durable records:
   - `context.md` — purpose, scope, architecture, and relationships;
   - `glossary.md` — canonical terms and discouraged aliases;
   - `principles.md` — rules that constrain future work;
   - `decisions/` — durable choices and their rationale;
   - `system.md` — current shipped capabilities and contracts;
   - `stack.md` — current technical choices and architecture;
   - `work/` — transient Change Briefs currently being shaped or implemented.
4. If the notebook does not exist, use the `bootstrap` skill when the user wants to adopt Repo Notebook. Otherwise continue normally and do not create one unasked.

## Consult before work

Before a feature, bug fix, refactor, design change, or other implementation work:

1. Identify the relevant context areas, terms, principles, decisions, and current behavior.
2. Compare the request with the recorded contract.
3. If the request conflicts with a principle, decision, term, or boundary, state the conflict and cite the record.
4. If the request introduces a new durable choice, offer a decision record only when the choice should affect future work.
5. If purpose, scope, or a boundary remains materially ambiguous, use the `scope` skill to resolve it with the developer before implementation. Do not ask about details the repository or notebook can answer.
6. Do not block straightforward work on ceremony. A short confirmation is sufficient when a proposed context update is obvious and reversible.

## Reconcile after work

After implementation:

1. Inspect the actual diff and the behavior exercised by verification.
2. Identify only durable consequences:
   - changed terminology or relationships;
   - a new or revised principle;
   - a durable technical or development decision;
   - changed user-visible behavior or contracts;
   - changed runtime, framework, persistence, or architecture choices.
3. Use the `capture` skill to propose the necessary updates.
4. Present each proposal with its evidence, target record, and rationale. Offer **apply**, **edit**, or **skip**.
5. A valid result is **no notebook update needed**. Say so explicitly when nothing durable changed.

Never infer that a source change made the notebook stale. File-level git history is a useful drift signal, not proof that context needs changing.

## Boundaries

- Do not create milestones, task registries, approval gates, or execution plans.
- Do not assume an issue tracker platform. Use tools the harness provides when external issue state matters.
- Do not mirror mutable external issue state in the notebook.
- Do not treat a Change Brief as settled truth. Promote its durable consequences and remove the brief when the work is settled.
- Do not promote generic engineering advice into a project principle without developer confirmation.
