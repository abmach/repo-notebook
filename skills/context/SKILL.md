---
name: context
description: Use this skill when a project's Repo Notebook instruction directs you to consult durable context before work or reconcile the implementation with project truth afterward. It reads principles, glossary, decisions, current behavior, technical choices, and active Change Briefs, then surfaces conflicts and offers specific context updates.
license: MIT
---

# Project context

Use the current working-tree `.repo-notebook/` as curated project truth, including tracked records and intentionally local or ignored Change Briefs. Do not duplicate its content in the conversation and do not silently change it.

## Resolve the notebook

1. Resolve the project root. Prefer the Git repository root; otherwise use the current working directory.
2. Read `.repo-notebook/index.md` when it exists. Treat it as a map, not an exhaustive inventory. **Enumerate `decisions/` by listing the directory (do not rely on the index alone) and read every `accepted` decision whose subject overlaps the requested change.** Skipping `decisions/` before a change that touches current truth is a consultation failure: a superseding decision cannot be identified if the owning record was never read.
3. Read the relevant durable records and active Change Briefs:
   - `context.md` — purpose, scope, architecture, and relationships;
   - `glossary.md` — canonical terms and discouraged aliases;
   - `principles.md` — rules that constrain future work;
   - `decisions/` — durable choices and their rationale;
   - `system.md` — current shipped capabilities and contracts;
   - `stack.md` — current technical choices and architecture;
   - `work/` — transient Change Briefs currently being shaped or implemented.
4. Treat Change Briefs as guidance for the current scope, not as settled project truth.
5. If the notebook does not exist, use the `bootstrap` skill when the user wants to adopt Repo Notebook. Otherwise continue normally and do not create one unasked.

## Consult before work

Before a feature, bug fix, refactor, design change, or other implementation work:

1. Identify the relevant context areas, terms, principles, decisions, current behavior, technical choices, and active Change Briefs. When the change touches a current-truth artifact (`context.md`, `stack.md`, `system.md`, `glossary.md`, `principles.md`) or a domain rule, this MUST include reading `decisions/` — the list step above is not optional for these changes.
2. If the request conflicts with a principle, decision, term, or boundary, state the conflict, cite the record, and use the `scope` skill to resolve it with the developer before implementation. Stating the conflict alone does not authorize proceeding.
3. If the request introduces a new durable choice, offer a decision record only when the choice should affect future work.
4. If purpose, scope, or a boundary remains materially ambiguous, use the `scope` skill to resolve it with the developer before implementation. Do not ask about details the repository or notebook can answer.
5. Do not block straightforward implementation on ceremony, but every notebook write still requires the `capture` skill's per-update **apply**, **edit**, or **skip** confirmation.

## Reconcile after work

After implementation:

1. Inspect the actual diff and the behavior exercised by verification. Reconcile only changes attributable to this task; exclude pre-existing and unrelated working-tree changes, and do not propose notebook updates for changes whose ownership is unclear.
2. Identify only durable consequences:
   - changed purpose, scope, boundary, terminology, or relationships;
   - a new or revised principle;
   - a durable technical or development decision;
   - changed user-visible behavior or contracts;
   - changed runtime, framework, persistence, or architecture choices.
   - a current-truth artifact (context, stack, system, glossary, principles) whose change supersedes an accepted decision—identify the owning decision and propose superseding it in the same atomic update.
3. Base current-behavior claims on successful verification that exercised the behavior. Cite the exact developer statement, record section, diff, or verification result supporting each proposal, and label inferences. If verification was absent, failed, or did not exercise the claim, say so and do not present that behavior as verified.
4. Use the `capture` skill to propose the necessary updates.
5. Present each proposal with its evidence, target record, and rationale. Offer **apply**, **edit**, or **skip**, and wait for the developer's response. **Apply** approves exactly the displayed proposal. **Edit** requests revised wording; it is not consent to write, so display the revision and obtain explicit approval before writing it. **Skip** changes nothing.
6. When the work touched a current-truth artifact or a domain rule, include an explicit `Decisions consulted: <ids and titles, or "none">` line in the reconcile output. A blank or missing line means the decision records were not consulted, which is the consultation failure the resolution step is meant to prevent.

Do not treat an unreviewed source diff alone as proof that context is stale. Verified behavior, an explicit contract change, or developer confirmation is evidence of a stale current-state record. Treat principles, decisions, terms, and boundaries as governing constraints, and `system.md` and `stack.md` as claims about current state. If records conflict with one another or with verified repository behavior, cite the conflicting sources and do not choose silently. Resolve governing-record conflicts with the developer and propose stale current-state corrections through `capture`.

## Boundaries

- Do not create milestones, task registries, approval gates, or execution plans.
- Do not assume an issue tracker platform. Use tools the harness provides when external issue state matters.
- Do not mirror mutable external issue state in the notebook.
- Do not treat a Change Brief as settled truth. Settle and remove it only through the `scope` and `capture` workflow after acceptance passes and approved durable consequences have been written. Otherwise leave the brief in place.
- Do not promote generic engineering advice into a project principle without developer confirmation.
