---
skill_id: "pick-one-gap"
name: "Pick One Gap"
skill_type: "instructional"
stance: "meta"
tags: ["teaching", "pedagogy", "prioritization", "feedback", "overload-prevention"]
course_types: ["humanities"]
learning_goal_tags:
  - "evaluate-reasoning"
  - "reflect-on-progress"
trigger_signals:
  - "student-has-many-errors"
  - "multiple-issues-in-draft"
---

# Pick One Gap

## Description
Avoids cognitive overload by selecting the single most important gap or error in a student's
work and directing feedback there, rather than listing every problem at once. Ensures the
student leaves each turn with one actionable priority instead of a paralyzing laundry list
of corrections.

## Skill Type
- **Type:** instructional
- **Course Focus:** Humanities

## When to Trigger
- Student's draft, response, or argument has multiple issues and the tutor is about to
  deliver feedback on all of them simultaneously.
- Student has submitted work with more than two or three distinct problems — addressing
  them all at once would overwhelm rather than help.
- Student is already showing signs of frustration or fatigue, and a long list of feedback
  would be counterproductive.
- A critique or review skill has identified several issues, and this skill is needed to
  triage and prioritize before delivering feedback.
- Student asks "What should I fix?" or "Where do I start?" when the work has many gaps.

---

## Tutor Stance
- One problem per turn is the default. Only address additional issues if the student
  explicitly asks and appears ready to handle them.
- Prioritize by impact, not by order of appearance. The most important gap is the one that,
  if fixed, would improve the overall argument the most — not the first one you noticed.
- Distinguish between **structural issues** (the argument's logic, the thesis, the
  organization) and **surface issues** (word choice, citation format, transitions). Structural
  issues almost always take priority.
- Acknowledge that other issues exist without enumerating them. "There are a few things to
  work on, but let's start with the one that matters most" is better than "Here are seven
  problems, but let's focus on number three."
- Once the student fixes the prioritized gap, reassess. The fix may resolve other issues, or
  it may surface new ones. Pick the next most important gap on the following turn.
- Trust the student to handle one thing well rather than handling many things poorly.

## Flow
### Step 1 — Inventory the Gaps
Identify all distinct issues in the student's work. For each, note:
- **Type:** structural (argument logic, missing evidence, flawed premise, organizational
  problem) or surface (transitions, word choice, citation mechanics, formatting).
- **Severity:** how much the issue weakens the overall argument or fails to meet the
  assignment's requirements.
- **Dependency:** does fixing this issue depend on fixing another one first? Does fixing it
  likely resolve other issues as a side effect?

### Step 2 — Rank by Impact
Choose the single highest-impact gap using these criteria (in order):
1. **Load-bearing structural issues first.** A flawed thesis or missing evidence undermines
   everything built on top of it. Fix the foundation before the walls.
2. **Upstream before downstream.** If Issue A causes Issue B, fix A. The student may not even
   need to address B separately.
3. **Assignment-critical requirements.** If the rubric or prompt explicitly requires something
   the student hasn't done, that takes priority over stylistic improvements.
4. **Student's own concern.** If the student flagged a specific worry, and it is legitimate,
   addressing it first builds trust and momentum.

### Step 3 — Frame the Priority
Deliver feedback on the selected gap only. Frame it as:
- **What's working:** brief, specific validation of what the student has done well.
- **The one thing to focus on:** a clear statement of the priority gap, why it matters, and
  what a fix would look like (without doing the fix for them).
- **Why this one first:** a brief rationale so the student understands the prioritization
  ("This is the foundation your other points rest on, so strengthening it will improve
  everything downstream").

### Step 4 — Defer the Rest
Explicitly acknowledge that there are other things to address without listing them:
- "Once you've strengthened this, we'll look at the next thing."
- "There's more to work on, but this is the most impactful place to start."
Do not enumerate the deferred issues — that recreates the laundry list you're trying to avoid.

### Step 5 — Reassess After the Fix
When the student returns with a revised version:
- Check whether the prioritized gap has been addressed.
- Check whether the fix resolved any of the other issues as a side effect.
- Pick the next highest-impact gap from the remaining list and repeat.

---

## Safe Output Types
- A single, clearly framed piece of feedback targeting the most important gap.
- A brief validation of what the student has done well.
- A rationale for why this gap was prioritized over others.
- A general acknowledgment that other issues exist, without enumerating them.
- A prompt directing the student to address the selected gap.

## Must Avoid
- Delivering a laundry list of every issue in the student's work. This is the core failure
  mode this skill prevents.
- Burying the priority in a list of other concerns. If you mention six things and say "but
  focus on this one," the student will still feel overwhelmed by the six.
- Prioritizing surface issues over structural ones. Fix the argument before polishing the
  prose.
- Picking the easiest issue instead of the most impactful one. The goal is maximum
  improvement per turn, not maximum comfort.
- Fixing the gap for the student. Identify it, explain why it matters, and let them do the
  work.
- Listing all deferred issues "for reference." The student doesn't need to see the full list
  — they need to see one thing to do next.

## Example Exchange
> **Student:** "Here's my draft. I know it probably needs a lot of work — can you tell me
> what to fix?"
>
> **Tutor:** "There's definitely more than one thing to work on, but let's start where it
> matters most. Your thesis makes a claim about a broad shift, but the body paragraphs only
> discuss one specific case. The argument will be much stronger if you either narrow the
> thesis to match your evidence, or bring in a second case to support the broader claim.
> Which direction feels right to you? Once that's settled, we'll move to the next thing."

---

## Inputs
Materials the skill needs:
- Student's draft, response, or artifact (the work being reviewed).
- Assignment context and rubric (to understand what "most important" means relative to the
  task's requirements).
- Conversation history (to avoid re-prioritizing a gap the student has already addressed).
- Any upstream critique or review output that has already inventoried issues.

## Outputs
What the skill produces:
- **Priority gap:** the single most important issue to address, with a clear description of
  what it is and why it matters.
- **Validation:** a brief acknowledgment of what the student has done well.
- **Action prompt:** a question or directive that guides the student toward fixing the gap
  without doing it for them.
