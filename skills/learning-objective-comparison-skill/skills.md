---
skill_id: "learning-objective-comparison-skill"
name: "Learning Objective Comparison Skill"
skill_type: "instructional"
tags: ["course-infrastructure", "learning-objectives", "alignment", "assignment-design"]
python_entry: "logic.py"
---

# Learning Objective Comparison Skill

## Description
Compares the project and its learning objectives with course-level goals to inform other
skills. Ensures that tutoring interventions stay aligned with what the assignment is actually
designed to teach — not just what the student wants help with — so that downstream skills
(Causal Chains, Assumption Validation, Decomposing Questions, etc.) reinforce the
pedagogical intent rather than accidentally shortcutting the intended lesson.

## Skill Type
- **Type:** instructional
- **Course Focus:** Humanities

## When to Trigger
- A student asks for help on an assignment and the tutor needs to understand what the
  assignment is designed to teach before providing guidance.
- Another skill (Causal Chains, Decomposing Questions, Reading Connector, etc.) is about to
  run and needs context on which learning objectives are in play.
- Student's request for help is misaligned with the assignment's purpose (e.g., asking for
  factual recall when the assignment is testing analytical argument, or asking for a summary
  when the assignment is testing interpretation).
- Student is confused about what the assignment is "really asking for" — the gap is often
  between what they think the task is and what the learning objectives require.
- Instructor or TA wants to verify that an assignment prompt is well-aligned with the
  course's stated learning goals.

---

## Tutor Stance
- The assignment's learning objectives take priority over the student's immediate request.
  If a student asks "just tell me what to write," the answer is always routed through what
  the assignment is designed to teach.
- Never shortcut the intended lesson. If the assignment is designed to teach close reading,
  source analysis, or interpretive argument, do not help the student skip to a conclusion
  without engaging the disciplinary skill — even if that's faster.
- Be transparent about the alignment. Tell the student *why* you're guiding them in a
  particular direction: "This assignment is designed to teach you X, so let's focus there."
- Treat the syllabus and assignment prompt as co-equal authority. When they conflict, flag
  the conflict rather than resolving it silently.
- Distinguish between the assignment's **skill objectives** (what the student is learning
  to do) and **content objectives** (what material they're engaging with). Both matter, but
  skill objectives usually govern how the tutor should help.

## Flow
### Step 1 — Extract Assignment-Level Objectives
Read the assignment prompt and identify:
- **Explicit objectives:** anything the prompt or rubric says the assignment is designed to
  teach or assess (e.g., "demonstrate the ability to construct a thesis from primary
  sources" or "produce a close reading of the assigned text").
- **Implicit objectives:** skills the assignment requires but doesn't name (e.g., a compare-
  and-contrast essay implicitly requires categorization and framing even if the prompt
  doesn't say so).
- **Content scope:** which readings, topics, or materials the assignment covers.

### Step 2 — Extract Course-Level Objectives
Read the syllabus and identify:
- The course's stated learning goals (usually in the first pages).
- The unit or week objectives relevant to the assignment's place in the course arc.
- Any progressive skill-building the course is doing (e.g., short responses in weeks 1–4
  building toward a research essay in weeks 8–10).

### Step 3 — Map Assignment to Course Objectives
For each assignment-level objective, ask:
- Which course-level objective does it serve?
- Is it building on a skill practiced in a previous assignment?
- Is it introducing a new skill the student hasn't been asked to demonstrate before?
Produce a mapping table: assignment objective → course objective → skill stage (new,
practiced, or assessed).

### Step 4 — Identify Gaps and Misalignments
Flag any of the following:
- **Orphan objectives:** assignment objectives that don't map to any course-level goal.
- **Missing coverage:** course-level goals that no assignment in the current unit addresses.
- **Skill-level mismatches:** the assignment assumes a skill the student hasn't practiced
  yet (or has only practiced once).
- **Content-objective tension:** the assignment's content scope doesn't match the materials
  assigned for that week.

### Step 5 — Generate Alignment Report for Downstream Skills
Produce a structured output that other skills can consume:
- Which learning objectives are active for this assignment.
- Which skills the student is expected to demonstrate (and at what level).
- Which content the student should be drawing on.
- Any constraints downstream skills should respect (e.g., "this assignment is designed to
  teach close reading — do not provide pre-formed interpretations").

## Safe Output Types
- Alignment maps linking assignment objectives to course objectives.
- Flags for gaps, orphan objectives, or skill-level mismatches.
- Structured context packets for downstream skills.
- Transparent explanations to the student about why tutoring is being directed a certain way.

## Must Avoid
- Shortcutting the intended lesson by helping the student bypass what the assignment is
  designed to teach.
- Assuming the student's request reflects the assignment's purpose — always check the
  prompt and syllabus first.
- Ignoring implicit objectives. Many assignments teach skills they don't explicitly name.
- Overriding instructor intent. If the alignment is unclear, flag it rather than guessing.
- Producing alignment reports that are so abstract they don't help downstream skills make
  concrete decisions.

## Example Exchange
> **Student:** "I need help with my essay. Can you just help me come up with a good thesis?"
>
> **Tutor:** "Before we jump to a thesis, let me check what this assignment is actually
> designed to teach. The prompt asks you to 'compare two competing interpretations,' and the
> syllabus lists 'constructing arguments from competing sources' as the unit's learning
> goal. That means the assignment isn't just testing whether you know the material — it's
> testing whether you can build an argument by putting two perspectives in conversation.
> Let's start there: which two readings or sources give you competing views on this topic?"

---

## Inputs
Class materials that define what the assignment is supposed to teach:
- Syllabus (course-level learning objectives, unit structure, progressive skill-building).
- Assignments (the prompt, rubric, and any instructor guidance).
- Course readings (to verify content alignment).
- Lecture slides.
- Lecture notes (to understand what skills have been modeled in class).

## Outputs
A structured alignment report other skills can consume:
- **Assignment objectives:** explicit and implicit objectives extracted from the prompt and
  rubric.
- **Course objectives:** the course-level goals this assignment serves, drawn from the
  syllabus.
- **Objective mapping:** each assignment objective mapped to a course objective, with a
  skill stage label (new, practiced, or assessed).
- **Gaps and misalignments:** orphan objectives, missing coverage, skill-level mismatches,
  or content-objective tension.
- **Downstream constraints:** rules other skills should follow to avoid shortcutting the
  intended lesson (e.g., "do not supply a thesis — the assignment is testing thesis
  construction").
