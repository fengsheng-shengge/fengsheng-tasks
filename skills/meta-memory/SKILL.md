---
name: meta-memory
description: Build agent memory system. Every time you decide to show your valuable finished outcome, USE THIS SKILL to make a memory (can be done by subagent if possible). Every time you decide to do a task, USE THIS SKILL to read memory.
---
# Meta-Memory Skill for Agent
Use this skill to keep agent context clean by storing durable memory as files:
- **Index layer:** a compact, self-improving storyline across all flat units.
- **Unit-name layer:** context-cheap folder names that reveal the rough work map before opening files.
- **Brief layer:** small, attention-ready memory handle for one memory record inside a unit.
- **Full layer:** detailed evidence, notes, excerpts, code references, and open questions for that record.

## Trigger
Use meta-memory when current work becomes **memorably disentangled**.
A task is memorably disantangled when it is completed or stable enough that the agent can describe its minimum useful work area with one strict unit name:
```text
<1verb>-<1adjective-or-1modifier>-<1noun>.unit
```

Good memorization moments:
- completed experiment run -> `run-baseline-experiment.unit`
- paper or literature-reading block -> `read-deeplearning-paper.unit`
- independent coding task/module investigation -> `debug-auth-module.unit`
- bounded design decision -> `design-semantic-workflow.unit`
- future plan that can stand alone -> `plan-incremental-migration.unit`
- reusable conversation concept -> `clarify-memory-concept.unit`

Do not memorize yet when:
- the work is still a live chain of reasoning with no stable boundary
- the agent cannot produce a valid three-token unit name
- the memory would be only a vague transcript or mood

## Storage
Memory is organized like a skill system: each unit gets a folder under `units/`, and each folder may contain many named brief/full pairs.

```text
<memory-root>/
├── index.md
└── units/
    ├── read-deeplearning-paper.unit/
    │   ├── 0.transformer-attention.brief.md
    │   ├── 0.transformer-attention.full.md
    │   ├── 1.diffusion-survey.brief.md
    │   └── 1.diffusion-survey.full.md
    └── run-baseline-experiment.unit/
        ├── 0.first-clean-run.brief.md
        └── 0.first-clean-run.full.md
```

## Strict unit folder naming rules
Every unit folder name must follow: `<verb>-<adjective-or-modifier>-<noun>.unit`
- exactly three semantic tokens before `.unit`
- lowercase kebab-case ASCII
- token 1: action verb (read, run, test, build, debug, compare, refactor, design, plan, review)
- token 2: one adjective or compact modifier (deeplearning, baseline, rag, auth, parallel, semantic)
- token 3: one concrete noun (paper, experiment, module, method, workflow, decision, concept)

## Memory record naming rules
Inside a unit: `<record-index>.<record-name>.brief.md` and `<record-index>.<record-name>.full.md`
- `<record-index>`: zero-based integer local to the unit (0, 1, 2, ...)
- `<record-name>`: short, semantic, lowercase kebab-case

## Index behavior
`index.md` is NOT a dump and NOT a pyramid. It is the agent-maintained, self-improving flat map and storyline across units.

## Context-saving recall protocol
When recalling memory, use the cheapest layer first:
1. Read `index.md` if it exists.
2. Inspect only folder names under `units/*.unit/` to understand the flat unit map.
3. Inspect filenames inside likely unit folders to see available memory records.
4. Open relevant `*.brief.md` files only when index + names are insufficient.
5. Open matching `*.full.md` only when expansion decision rules say depth is needed.

## Brief file format
```markdown
---
id: <record-index>.<record-name>
unit: <unit-name>
title: <title>
type: paper | code | experiment | conversation | concept | decision | other
status: seed | active | mature | stale
full: <record-index>.<record-name>.full.md
tags: [tag-one, tag-two]
updated: YYYY-MM-DD
---
# <Title>
## One-line memory
<Shortest useful recall cue.>
## Why it matters
<Why this is worth future retrieval.>
## Core idea
<3-7 bullets max.>
## Relations
- Index storyline: <index heading or short description>
- Related records: [<other-record>](<other-index>.<other-record>.brief.md)
## When to expand
<Concrete triggers for reading the full note.>
```

## Full file format
```markdown
---
id: <record-index>.<record-name>
unit: <unit-name>
title: <title>
brief: <record-index>.<record-name>.brief.md
source: <path/session/paper/url>
updated: YYYY-MM-DD
---
# <Title> — Full Memory
## Context
<Where this came from and what problem it answers.>
## Detailed notes
<Full explanation, quotes, evidence, implementation details.>
## Key excerpts / anchors
<Link to exact files, paper sections, logs, commits, or messages.>
## Implications
<What this changes for future research/coding/thinking.>
## Open questions
<What remains uncertain.>
```

## Expansion decision rules
Expand from brief to full when at least one is true:
- The current answer depends on exact evidence, quotes, code, or chronology.
- The brief says there is an unresolved uncertainty relevant to the task.
- The user asks for depth, proof, implementation details, or comparison.
- Multiple briefs conflict and the full notes are needed to resolve the conflict.
- The task is high-impact and a shallow summary would be risky.

Stay at brief level when:
- The user only needs orientation.
- The brief already contains enough information for the next step.
- Loading full material would crowd out more relevant context.
