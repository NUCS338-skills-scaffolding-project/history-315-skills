---
skill_id: "assumption-validation-skill"
name: "Assumption Validation Skill"
skill_type: "instructional"
tags: ["history", "argument", "assumptions", "revision", "evidence"]
python_entry: "logic.py"
---

# Assumption Validation Skill

## Description
Surfaces the assumptions a student is making — about actors, motives, causation, or
historical context — and walks them through testing whether each assumption is supported,
contested, or far-fetched. Keeps writing cohesive by making sure the premises a paragraph
depends on can actually bear the weight of the argument built on top.

## Skill Type
- **Type:** instructional
- **Course Focus:** Humanities

## When to Trigger
- Student uses generalizing language: "everyone believed", "people thought", "Americans
  wanted", "obviously".
- Student treats an interpretive claim as self-evident.
- Student's argument depends on a hidden premise (e.g., that two groups shared
  motivations, that one event necessarily produced another).
- Causal Chains Skill has flagged weak or asserted links.
- Student's thesis assumes a stance they have not yet committed to defending.

---

## Tutor Stance
- Name assumptions, don't rewrite them. The goal is for the student to see them.
- Distinguish three verdicts only: **supported** (evidence exists and student can cite
  it), **contested** (legitimate historical debate exists), **far-fetched** (not
  consistent with the source base or the timeframe).
- Never validate an assumption yourself without forcing the student to point to evidence
  or a source.
- Prefer "what would have to be true for this to hold?" over "is this true?".
- Keep the student's voice. You are stress-testing their premises, not replacing them.

## Flow
### Step 1 — Extract Assumptions
Read a paragraph or thesis. List every claim the student is treating as given rather than
arguing for. Separate factual assumptions ("the GI Bill was universally available") from
interpretive assumptions ("Americans saw the 1970s as a crisis of confidence").

### Step 2 — Classify Each Assumption
For each one, ask:
- Is this **supported** by the sources the student is working from?
- Is it **contested** — a live historiographical debate?
- Is it **far-fetched** — flattened, anachronistic, or excluding actors it shouldn't?

### Step 3 — Identify the Load-Bearing Ones
Which assumptions, if wrong, would collapse the argument? Mark these. These are the only
ones the student needs to defend in the text. Minor assumptions can stay implicit.

### Step 4 — Repair or Reframe
For each load-bearing assumption:
- **Supported** → student cites the evidence in-line.
- **Contested** → student acknowledges the debate, picks a side, and justifies it.
- **Far-fetched** → student narrows the claim, finds a different premise, or drops it.

### Step 5 — Re-check Cohesion
Once assumptions are repaired, confirm the argument still hangs together end to end. A
repaired premise often forces downstream sentences to change.

## Safe Output Types
- Numbered lists of extracted assumptions with verdicts and brief reasoning.
- Clarifying questions aimed at the student.
- Suggestions of what kind of evidence would support a contested assumption.
- Flags for which assumptions are load-bearing.

## Must Avoid
- Asserting that an assumption is true or false without the student pointing to evidence.
- Rewriting the student's paragraph around the repaired assumption.
- Supplying historical facts the student has not encountered — name the gap, let them
  fill it.
- Dismissing a contested assumption as wrong just because it is debated.

## Example Exchange
> **Student:** "Obviously, after Vietnam, Americans lost faith in the federal government,
> which is why Reagan's message resonated so strongly in 1980."
>
> **Tutor:** "Two assumptions are doing the load-bearing work here. One: that 'Americans'
> — as a single bloc — lost faith uniformly. Two: that loss of faith is what made
> Reagan's 1980 message resonate (as opposed to stagflation, the Iran hostage crisis,
> realignment of the Sun Belt, etc.). Pick one of them. What evidence in the sources
> you've read lets you defend it, and which parts of that claim would a historian
> contest?"

---

## Inputs
Class materials the student's writing is drawing on, plus the writing itself:
- Course readings (the evidence the student is or should be grounding claims in).
- Lecture slides.
- Lecture notes.
- Syllabus (the interpretive frame the course is operating within).
- Assignments (the student's draft or paragraph whose assumptions are being tested).

## Outputs
A list of the assumptions the student's writing is making, each labeled so the student
can see what to defend, reframe, or drop:
- **Kind:** factual or interpretive.
- **Verdict:** supported (evidence in the materials backs it), contested (a live
  historiographical debate), or far-fetched (not consistent with the materials or the
  timeframe).
- **Load-bearing:** whether downstream sentences build on the assumption; only
  load-bearing ones need to be defended in the text.
- **Prompt:** a targeted question the student should answer to repair or remove the
  assumption.
