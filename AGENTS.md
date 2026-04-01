# AGENTS.md

## Project
School assistant MVP for parents and students.

## Source of truth
Always follow these files first:
1. docs-source/school_assistant_mvp_funnel_spec_v2.json
2. docs-source/school_assistant_mvp_funnel_brief_v2.md
3. docs-source/school_assistant_mvp_funnel_outline_v2.md
4. docs-source/school_assistant_mvp_tz_v1.md
5. docs/PRODUCT_SPEC.md
6. docs/ARCHITECTURE.md
7. docs/API_SPEC.md
8. docs/DB_SCHEMA.md
9. docs/UI_GUIDELINES.md
10. PLANS.md

`docs-source/` contains the raw source materials. Files in `docs/` are the normalized working docs derived from them.

If code conflicts with docs, do not silently invent a new direction.
Document the conflict and propose the smallest safe fix.

## Product priorities
1. Minimal friction at entry
2. Strong value before registration
3. Parent-first experience
4. Clean chat UX
5. History without chaos
6. Admin control over quotas and prompt profiles
7. Cost-aware implementation
8. Mobile-first UI
9. Keep the MVP narrow
10. Avoid speculative features

## Hard constraints
- Do not add new product modules outside the spec.
- Do not introduce heavy dependencies without clear need.
- Do not redesign the app into a complex dashboard.
- Do not replace the chat-first UX.
- Do not collect unnecessary personal data.
- Do not store math explanations as image generation output when deterministic math rendering is available.
- Do not break guest -> value -> capture flow.
- Do not break the history grouping model: grade -> subject -> topic -> chats.

## Engineering rules
- Prefer small, reviewable diffs.
- Run lint, typecheck, and relevant tests after each milestone.
- Keep components simple.
- Prefer explicit naming over clever abstractions.
- Add comments only where they reduce real ambiguity.
- Update docs when architecture or behavior changes.

## UI rules
- Minimalist, calm, friendly.
- Mobile-first.
- High readability.
- Low visual noise.
- Few primary actions per screen.
- White or light base.
- Soft accents only.
- Friendly microcopy.

## Task format
For every task, restate:
- Goal
- Context
- Constraints
- Done when

If the task is large or ambiguous, plan first before coding.

## Done when
A task is done only if:
- it matches the spec
- it passes verification
- docs are updated if needed
- no obvious regression is introduced

## Role preferences
- architect: spec fidelity and design decisions
- backend-worker: schema, endpoints, session and quota logic
- frontend-worker: chat UI, history, filters, forms
- design-guardian: UI consistency and friendly style
- qa-reviewer: happy path and edge-case checks
- refactor-worker: simplification without behavior drift
