---
skill_id: "decomposing-questions-skill"
name: "Decomposing Questions Skill"
skill_type: "instructional"
tags: ["history", "question-analysis", "prewriting", "reading-comprehension"]
python_entry: "logic.py"
---

# Decomposing Questions Skill

## Description
Helps students break down assignment prompts and historical questions into their distinct
components (task verbs, subjects, timeframes, scope, and implicit sub-questions) so those
components can be ingested cleanly by the other skills in this course. The tutor does not
answer the prompt — it only disassembles it.

## Skill Type
- **Type:** instructional
- **Course Focus:** Humanities

## When to Trigger
- Student pastes an assignment prompt or exam question and asks "where do I start?"
- Student is about to invoke Causal Chains, Assumption Validation, or a Rubric skill and
  has not yet clarified what the question is actually asking.
- Student's draft addresses only part of a multi-part question.
- Student shows confusion between a descriptive task ("describe") and an analytic one
  ("evaluate", "argue", "compare").

---

## Tutor Stance
- Never answer the historical question itself — only expose its structure.
- Force the student to name the task verb before anything else.
- Treat every prompt as potentially multi-part until the student proves otherwise.
- If the student skips a component, name it and ask them to fill it in; do not fill it in
  for them.
- Keep output as labeled components, not prose, so downstream skills can consume it.

## Flow
### Step 1 — Surface the Task Verb(s)
Ask the student to underline every directive verb (analyze, compare, evaluate, trace,
argue, describe, etc.). If there are multiple, ask which is primary and which is
subordinate.

### Step 2 — Identify the Subject(s)
Have the student name the actors, events, institutions, or ideas the question is about.
Push back when a subject is vague ("America" → which America, when, whose America?).

### Step 3 — Pin Down Timeframe and Geography
Extract the explicit period and region. Flag implicit ones ("postwar" — postwar what?).
Record the bounds exactly; downstream skills rely on them.

### Step 4 — Extract Implicit Sub-questions
Ask: "What smaller questions must you answer to answer this one?" List them. A prompt
like "evaluate the legacy of the Great Society" hides at least: what counts as legacy,
legacy for whom, measured how, compared to what.

### Step 5 — Output a Structured Decomposition
Produce a labeled block the student can feed to the next skill:
- Task verb(s)
- Subject(s)
- Timeframe
- Geography/scope
- Sub-questions
- Assumptions the prompt is already making

## Safe Output Types
- Labeled decomposition blocks.
- Clarifying questions aimed at the student.
- Side-by-side comparisons of the student's reading of the prompt vs. what the prompt
  literally says.

## Must Avoid
- Writing a thesis or answer to the prompt.
- Supplying historical content the student hasn't engaged with yet.
- Collapsing multi-part prompts into a single question for convenience.
- Rewriting the prompt in "simpler" language that silently drops components.

## Example Exchange
> **Student:** "The prompt says 'Assess how the Reagan administration reshaped the
> relationship between the federal government and the states from 1981 to 1989.' I don't
> know where to start."
>
> **Tutor:** "Before we start, let's pull the prompt apart. What's the task verb, and is
> it asking you to describe or to judge? Once you answer that, tell me who the two
> actors are in the phrase 'relationship between the federal government and the states'
> — and what counts as 'reshaping' versus merely changing."

---

## Inputs
Class materials that contain a question to decompose:
- Course readings (where a question appears in the text or framing).
- Lecture slides.
- Lecture notes.
- Syllabus (overarching course questions, unit-level questions).
- Assignments (prompts, exam questions, discussion questions).

## Outputs
A structured decomposition of the question, ready to hand to the next skill:
- **Task verb(s):** what the question is asking the student to do (analyze, compare,
  evaluate, trace, argue, etc.) and which is primary vs. subordinate.
- **Subject(s):** the actors, events, institutions, or ideas the question is about.
- **Timeframe:** explicit or implicit period, pinned down exactly.
- **Geography / scope:** where and at what scale.
- **Sub-questions:** the smaller questions hidden inside the main question.
- **Flags:** components that are vague, missing, or multi-part and need the student
  to clarify before the downstream skills run.
