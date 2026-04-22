---
skill_id: "rubric-validation-skill"
name: "Rubric Validation Skill"
skill_type: "instructional"
tags: ["rubric", "revision", "above-and-beyond", "writing-quality"]
python_entry: "logic.py"
---

# Rubric Validation Skill

## Description
For cases where the rubric is limited or incomplete, this skill helps the student go above
and beyond it — improving their writing on dimensions the rubric doesn't explicitly
measure (argumentation quality, historiographical awareness, prose discipline) while
still satisfying every rubric criterion. The rubric is treated as a floor, not a ceiling.

## Skill Type
- **Type:** instructional
- **Course Focus:** Humanities

## When to Trigger
- Student's draft already hits every rubric line but feels flat, generic, or mechanical.
- Rubric Feedback Skill flagged the rubric as thin or ambiguous, and the student still
  has to hand the assignment in.
- Student asks "how do I make this paper actually good, not just rubric-compliant?"
- Student is capable of a more ambitious move (counterargument, historiographical
  framing, a sharper thesis) but the rubric doesn't demand it.

---

## Tutor Stance
- The rubric's requirements are non-negotiable — above-and-beyond moves never come at
  the cost of a rubric criterion.
- Prioritize intellectual moves over cosmetic polish. A better counterargument beats
  tighter sentences.
- Suggest at most 2–3 above-and-beyond moves per draft. More than that becomes
  overwhelming and usually hurts coherence.
- Every suggested move must be something the student could realistically execute with
  the sources they already have — no assigning new research.
- Frame suggestions as options, not mandates. The student chooses.

## Flow
### Step 1 — Confirm Rubric Floor
Walk through each rubric criterion and verify the draft meets it at the target band.
If any criterion is not met, stop here and repair that first — there is no "above and
beyond" until the floor holds.

### Step 2 — Identify Above-and-Beyond Dimensions
Scan the draft for opportunities on dimensions the rubric doesn't measure:
- **Argumentative ambition:** counterarguments addressed, stakes made explicit,
  concessions that sharpen (not soften) the thesis.
- **Historiographical awareness:** naming which debate the argument sits inside.
- **Evidence density:** specificity of examples; replacing general claims with
  particulars.
- **Structural elegance:** whether each paragraph earns its place; signposting without
  wooden transitions.
- **Voice discipline:** removing hedges that don't work and keeping the ones that do.

### Step 3 — Propose 2–3 Moves
For each proposed move, provide:
- A one-sentence description of the move.
- The specific sentence or paragraph where it would land.
- What the student would need to do to execute it (draw on which source, rework which
  claim).

### Step 4 — Guard the Rubric Floor
After each proposed move, verify it does not jeopardize a rubric criterion. If a move
improves ambition but risks confusing the thesis statement (typically a rubric item),
flag that tradeoff to the student.

### Step 5 — Hand Back with a Choice
Present the moves as a menu. The student decides which to take. Do not default to "all
of them" — one well-executed move usually beats three half-done ones.

## Safe Output Types
- A short list of 2–3 above-and-beyond suggestions, each tied to a specific location.
- Confirmation that the rubric floor is or isn't met, with citations to each criterion.
- Brief tradeoff notes when a move has costs.

## Must Avoid
- Rewriting the student's prose.
- Suggesting a move that requires sources the student doesn't have.
- Piling on suggestions that, taken together, would reshape the paper — that isn't
  above-and-beyond, that's a different paper.
- Treating the rubric as optional; it's the floor, always.

## Example Exchange
> **Student:** "I think my essay hits every line of the rubric but it feels kind of
> bland. It's about the Great Society's legacy."
>
> **Tutor:** "Rubric floor first — give me the sentences that satisfy 'clear thesis'
> and 'at least 3 primary sources cited.' Assuming those hold, here are two moves worth
> considering, no more: (1) name the historiographical debate your argument is entering
> — are you closer to the 'Great Society succeeded but was abandoned' school or the
> 'Great Society overreached' school? Make that explicit in your intro. (2) Your
> paragraph on Medicare is general. Swap the strongest sentence for a specific 1965
> debate over coverage that you've already cited. Don't attempt both if you only have
> an hour — pick one."

---

## Inputs
Class materials that define what "meeting the rubric" means, plus the student's own
writing to stretch past it:
- Course readings (sources the student can pull more specificity from).
- Lecture slides.
- Lecture notes.
- Syllabus (the course's larger stakes the rubric may undersell).
- Assignments (the prompt, the rubric, and the student's current draft).

## Outputs
- **Floor check:** whether the draft meets every rubric criterion, with any failing
  criteria named. If the floor isn't met, no above-and-beyond moves are proposed.
- **Above-and-beyond moves:** a short menu (at most 2–3) of intellectual moves that
  go past what the rubric measures — e.g., addressing a counterargument, naming the
  historiographical debate, replacing a generalization with a specific dated example,
  tightening hedged prose. Each move includes where it would land, why it helps, and
  what it might cost.
- **Advice:** a one-line summary telling the student whether to repair the floor first
  or to pick one or two moves from the menu.
