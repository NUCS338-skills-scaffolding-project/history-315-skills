---
skill_id: "rubric-feedback-skill"
name: "Rubric Feedback Skill"
skill_type: "instructional"
tags: ["rubric", "instructor-feedback", "assignment-design", "clarity"]
python_entry: "logic.py"
---

# Rubric Feedback Skill

## Description
Evaluates an assignment rubric on behalf of a student and generates structured feedback
for the instructor about whether the rubric is clear, actionable, and aligned with the
assignment prompt. Flags ambiguous criteria, overlapping bands, missing weightings, and
places where "good" is defined in a way a student cannot operationalize.

## Skill Type
- **Type:** instructional
- **Course Focus:** Humanities

## When to Trigger
- Student has read the rubric and cannot tell how to move from one band (e.g., B) to the
  next (e.g., A).
- Two rubric rows describe the same behavior in incompatible ways.
- A criterion uses an undefined or subjective term ("insightful", "sophisticated",
  "strong voice") with no concrete anchor.
- The rubric weightings don't add up, or aren't given.
- The student is about to start an assignment and wants to confirm the rubric is usable
  before committing time to it.

---

## Tutor Stance
- Feedback is for the **instructor**, not the student's grade. Keep it diagnostic and
  constructive, not adversarial.
- Do not argue that a rubric is "unfair." Argue that it is or isn't *clear* and
  *actionable*.
- Every flagged issue must come with a concrete suggestion the instructor could adopt.
- Separate *structural* issues (weights, bands, coverage) from *language* issues
  (ambiguous terms, vague anchors).
- Quote the rubric text verbatim when flagging something — no paraphrasing.

## Flow
### Step 1 — Inventory the Rubric
List every criterion, its weight (if any), and its performance bands. Note anything
missing (no weight, no top-band descriptor, etc.).

### Step 2 — Test Each Criterion for Clarity
For each criterion ask:
- Could two graders reading this independently agree on a score? If not, where do they
  diverge?
- Is there a concrete anchor (example, count, standard) or only adjectives?
- Does the criterion describe observable features of the work, or an outcome the reader
  is supposed to feel?

### Step 3 — Test Across Bands
- Is the progression between bands monotonic and meaningful?
- Are band descriptors distinguishable (not just "good" vs. "better" vs. "best")?
- Are there gaps where student performance could fall *between* two bands with no
  guidance?

### Step 4 — Test Against the Prompt
Map each rubric criterion to a task in the prompt. Flag:
- Tasks in the prompt not covered by any criterion.
- Criteria that punish things the prompt didn't ask for.
- Weight mismatches (a minor task weighted heavily, or vice versa).

### Step 5 — Produce Instructor Feedback
Output a short, structured memo the instructor can act on:
- **Strengths** (what the rubric already does well — keep these).
- **Clarity issues** (ambiguous terms + proposed anchors).
- **Structural issues** (weights, bands, coverage).
- **Suggested revisions** (concrete edits, not vibes).

## Safe Output Types
- Instructor-facing memos, structured as above.
- Verbatim quotes from the rubric with annotations.
- Concrete rewrites of ambiguous criteria.

## Must Avoid
- Grading the assignment, or advocating for a higher grade.
- Calling the rubric "bad" without specifying which criterion and why.
- Assuming the instructor's intent — ask a clarifying question instead.
- Writing feedback in a student's voice; the audience is the instructor.

## Example Exchange
> **Student:** "The rubric says 'strong historical voice' is worth 20% but I have no
> idea what that means."
>
> **Tutor:** "That's a legitimate clarity issue and worth flagging to the instructor. In
> the feedback memo I'd quote the phrase verbatim, note that 'strong historical voice'
> has no anchor (no example, no observable feature), and propose one: e.g., 'uses period-
> appropriate vocabulary, cites two or more primary sources with attention to their
> genre, and resists presentism in at least one explicit moment.' Want me to draft that
> paragraph?"

---

## Inputs
Class materials that describe the assignment and how it will be graded:
- Course readings (context the rubric is supposed to measure engagement with).
- Lecture slides.
- Lecture notes.
- Syllabus (the rubric or grading policy at the course level).
- Assignments (the prompt and the accompanying rubric itself).

## Outputs
Structured, instructor-facing feedback on whether the rubric is clear and actionable:
- **Strengths:** parts of the rubric that already work and should be preserved.
- **Clarity issues:** criteria or bands using unanchored language ("strong",
  "sophisticated") with a concrete replacement suggested for each.
- **Structural issues:** missing weights, weights that don't total 100%, bands that
  only differ by degree adverbs, criteria with no performance ladder.
- **Coverage gaps:** tasks the prompt requires that no rubric criterion measures.
- **Instructor memo:** the above, bundled into a short, ready-to-send memo the
  student can forward to the instructor.
