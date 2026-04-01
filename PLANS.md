# PLANS.md

## Goal
Build the MVP of a school assistant for parents and students with:
- guest mode
- text/image/voice input
- AI responses
- capture after value moment
- persistent history
- filters
- admin quota control
- prompt profiles
- usage tracking

## Non-goals
- multi-child support
- full academic planning
- Obsidian export
- school portals
- OCR-heavy platform
- broad “general AI” product scope

## Milestones

### M1. Project foundation
- repo structure
- env example
- docs aligned
- basic app shell
- db schema skeleton

### M2. Session and auth base
- guest sessions
- registration capture
- user profile
- consent logs

### M3. Core chat flow
- text input
- image upload
- voice upload
- AI response pipeline
- response mode controls

### M4. Conversation persistence
- save conversations
- subject/topic tagging
- history grouping
- filters

### M5. Admin cockpit
- quota policies
- prompt profiles
- feature flags
- user and usage views

### M6. Billing base
- plans
- payment records
- purchase screens
- no advanced provider-specific complexity unless selected

## Execution rules
- complete milestones in order
- after each milestone run verification
- fix failures before continuing
- keep diffs scoped
- update docs if structure changes

## Verification
At each milestone:
- lint passes
- typecheck passes
- relevant tests pass
- manual smoke path is documented

## Smoke path
1. open app as guest
2. send message
3. upload image
4. send voice
5. get useful answer
6. hit capture wall
7. register
8. save history
9. filter past chat
10. view quotas in admin

## Known open questions
- Yandex login in MVP or V1.5
- payment provider selection
- exact Russian hosting stack
