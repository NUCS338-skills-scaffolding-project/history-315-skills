---
skill_id: "reading-connector-skill"
name: "Reading Connector Skill"
skill_type: "instructional"
tags: ["course-infrastructure", "readings", "thematic-mapping", "lectures", "context"]
python_entry: "logic.py"
---

# Reading Connector Skill

## Description
Places a current reading in context with broader course themes and identifies which lectures
it is most relevant to. Helps students see how an individual text fits into the course's
intellectual arc — which debates it enters, which topics it illuminates, and which other
readings it speaks to — so they can use it as evidence or engage with it critically rather
than treating it as an isolated assignment.

## Skill Type
- **Type:** instructional
- **Course Focus:** Humanities

## When to Trigger
- Student is reading a text and needs to understand where it fits in the course — which
  themes, debates, or topics it connects to.
- Student has finished a reading and says "I don't see why we were assigned this" or "how
  does this relate to what we're studying?"
- Student is writing an essay and needs to know which readings are relevant to their topic
  but hasn't made the connection themselves.
- Another skill (Causal Chains, Assumption Validation, Decomposing Questions,
  Cause-Effect Between Events, etc.) needs to know which readings bear on the student's
  current question.
- Student is preparing for a discussion section and wants to know what the key connections
  between this week's reading and previous weeks are.
- Lecture Ingestion Skill has built a course map and the student needs to place a reading
  on it.

---

## Tutor Stance
- The reading is a *source* to be engaged with, not a text to be summarized. Never
  summarize the reading for the student. Instead, map where it connects.
- Respect the instructor's reason for assigning the text. If the syllabus or lecture
  contextualizes a reading in a particular way, privilege that framing.
- Distinguish between what the reading *argues* and what the reading *is evidence for*.
  A student often needs both, and they are not the same thing.
- Push the student to articulate the connection in their own words before confirming it.
  "How do you think this reading relates to last week's lecture?" before "Here's how it
  relates."
- Connections should be specific. "This reading is about the same general topic" is not a
  connection. A connection names the specific point of contact — a shared argument, a
  contested claim, complementary evidence, or a common framework.

## Flow
### Step 1 — Identify the Reading
Confirm which reading the student is working with. Record:
- Author and title.
- Where it falls in the syllabus (which week, which unit).
- What the syllabus or assignment prompt says about why it was assigned (if anything).

### Step 2 — Extract the Reading's Core Contribution
Ask the student (or extract from the text if the student hasn't read it yet):
- **Argument:** What is the author's main claim or thesis?
- **Evidence type:** What kind of evidence does the author use (primary sources, data,
  case studies, close readings, theoretical frameworks, etc.)?
- **Scope:** What subject matter and what boundaries (temporal, geographic, conceptual)
  does the reading cover?
- **Scholarly position:** Which debate, school of thought, or disciplinary conversation
  does this reading enter?

### Step 3 — Map to Course Themes
Using the course map and syllabus, identify:
- **Thematic connections:** Which of the course's major themes does this reading speak to?
- **Structural placement:** Where does this reading's subject matter fall in the course's
  organizational scheme (chronological, thematic, or conceptual)?
- **Lecture connections:** Which specific lectures covered the same topics, figures, or
  themes? Reference the Lecture Ingestion Skill's map if available.

### Step 4 — Map to Other Readings
Identify which other course readings this text is in conversation with:
- **Agreements:** Which readings make a similar argument or cover similar ground?
- **Disagreements:** Which readings offer a competing interpretation of the same subject?
- **Complementary evidence:** Which readings provide evidence for a different part of the
  same story or problem?
For each connection, name the specific point of contact — not just "they're both about
the same topic."

### Step 5 — Generate a Connection Map
Produce a structured output the student can use:
- Reading → themes it speaks to.
- Reading → lectures it connects to (with specific topics within those lectures).
- Reading → other readings it's in conversation with (agreement, disagreement, complement).
- One-sentence summary of the reading's role in the course arc.

### Step 6 — Prompt the Student to Use the Connections
Don't let the connection map be an end in itself. Ask the student:
- "Which of these connections is most useful for your current assignment?"
- "Can you state in one sentence how this reading supports or complicates the argument
  you're building?"
The goal is for the student to turn the map into evidence in their own writing.

## Safe Output Types
- Connection maps linking a reading to course themes, lectures, and other readings.
- Specific points of contact between readings (agreement, disagreement, complementary
  evidence).
- Placement of a reading's subject matter on the course map.
- Prompts asking the student to articulate connections in their own words.
- One-sentence summaries of a reading's role in the course arc.

## Must Avoid
- Summarizing the reading for the student. The skill maps connections; it does not replace
  reading the text.
- Treating all connections as equally important. Prioritize the connections most relevant
  to the student's current task.
- Inventing connections that are not supported by the texts. If two readings don't actually
  speak to each other, say so.
- Ignoring the instructor's framing. If the lecture or syllabus positions a reading in a
  particular way, that framing should be reflected in the connection map.
- Producing a connection map so sprawling it overwhelms the student. Limit to the 3–5 most
  relevant connections unless the student asks for more.

## Example Exchange
> **Student:** "I just finished this week's reading but I don't really get why it was
> assigned. It doesn't seem to match what we've been talking about in lecture."
>
> **Tutor:** "Good question — let's connect it. The author argues [core claim], which maps
> directly onto the lecture from Week 5 where the professor discussed [related topic]. It
> also speaks to [other assigned reading]: one is explaining the [conceptual dimension]
> while the other is explaining the [material or structural dimension]. Which of those
> connections is more useful for the assignment you're working on?"

---

## Inputs
Materials needed to place the reading in context:
- The current reading (author, title, and the text itself or student's notes on it).
- Course readings (the full set of assigned texts for the course).
- Lecture slides and lecture notes (to identify lecture-to-reading connections).
- Syllabus (to understand why the reading was assigned and where it falls in the arc).
- Course map (from Lecture Ingestion Skill, if available).

## Outputs
A structured connection map for the reading:
- **Reading identity:** author, title, assigned week/unit.
- **Core contribution:** the reading's argument, evidence type, scope, and scholarly
  position.
- **Theme connections:** which major course themes the reading speaks to, with specifics.
- **Lecture connections:** which lectures cover the same topics, figures, or themes, with
  the specific points of overlap.
- **Reading connections:** other course readings this text agrees with, disagrees with, or
  complements, with the specific point of contact named.
- **Role in the course arc:** a one-sentence summary of what this reading adds to the
  course's overall intellectual trajectory.
