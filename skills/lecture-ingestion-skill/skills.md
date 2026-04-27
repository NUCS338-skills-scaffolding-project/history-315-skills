---
skill_id: "lecture-ingestion-skill"
name: "Lecture Ingestion Skill"
skill_type: "instructional"
tags: ["course-infrastructure", "lectures", "timeline", "indexing", "context"]
python_entry: "logic.py"
---

# Lecture Ingestion Skill

## Description
Pulls key items from lectures to construct an overall course map — chronological, thematic,
or both — and a concept index; used as a reference by other skills. Transforms raw lecture
materials (slides, notes, recordings) into a structured map that downstream skills
(Causal Chains, Reading Connector, Decomposing Questions, Cause-Effect Between Events, etc.)
can query for context, so that tutoring stays grounded in what the course has actually
covered.

## Skill Type
- **Type:** instructional
- **Course Focus:** Humanities

## When to Trigger
- At the start of the term or when new lecture materials are uploaded, to build or update
  the course map.
- When another skill (Causal Chains, Reading Connector, Identify Misconceptions, etc.)
  needs to know what has been covered in lectures up to a given point.
- Student references something "from lecture" without specifying which lecture or what was
  said — this skill can locate the reference.
- Student is working on an assignment and needs to know which lectures are relevant to the
  topic.
- A new batch of lecture notes or slides arrives and the existing map needs updating.

---

## Tutor Stance
- Lecture materials are the primary source for what the *course* has taught, as distinct
  from what the readings say. Respect the instructor's framing — if the lecture emphasizes
  a particular interpretation or framework, index that interpretation, don't flatten it.
- Extract structure, don't summarize. The goal is an index the student and other skills can
  navigate, not a replacement for attending or reviewing the lecture.
- Preserve the instructor's organizational scheme. If the lecture groups topics in a
  particular way, use those categories rather than imposing textbook ones.
- Flag gaps honestly. If a lecture covers a topic without defining key terms, or discusses
  a concept without providing context, note that in the index rather than guessing.
- This is infrastructure, not tutoring. The output should be a reference artifact, not a
  conversation with the student.

## Flow
### Step 1 — Inventory Available Lecture Materials
Catalog what exists: slides, typed notes, handwritten notes (transcribed), audio/video
transcripts. For each lecture, record:
- Lecture number / date.
- Title or topic (as given by the instructor).
- Format of the available materials.

### Step 2 — Extract Key Items per Lecture
For each lecture, pull out:
- **Topics and developments:** key subjects discussed, with dates or contextual markers as
  stated in the lecture.
- **Figures and entities:** people, institutions, movements, groups, or texts named.
- **Concepts / terms:** vocabulary the instructor introduced or defined.
- **Interpretive claims:** any argument, framework, or framing the instructor offered (e.g.,
  "the instructor characterized this period as defined by a tension between X and Y").
- **Readings referenced:** which assigned readings the lecture explicitly connected to.
- **Assignments referenced:** any mention of upcoming or current assignments.

### Step 3 — Build the Course Map
Arrange extracted topics in the order that best fits the course's structure — chronological
for courses organized by time, thematic for courses organized by concept, or hybrid. For
each entry:
- Date, period, or thematic category.
- Topic name.
- Which lecture(s) covered it.
- Any interpretive framing the instructor attached to it.
Mark topics that appear in multiple lectures (these are likely high-priority for the course).

### Step 4 — Build the Concept Index
Create an alphabetical or thematic index of concepts and terms:
- Concept name.
- Definition or description as given in lecture.
- Which lecture introduced it.
- Related topics, figures, and entities.

### Step 5 — Validate and Flag Gaps
Review the map and index for:
- Topics mentioned without sufficient context.
- Concepts used but never defined.
- Weeks with no lecture materials available.
- Contradictions between lectures (e.g., a concept described differently in two lectures).
Flag these so downstream skills know where the data is thin.

### Step 6 — Publish the Reference Artifact
Output the course map and concept index in a structured format that other skills can query.
Update it incrementally as new lectures are ingested.

## Safe Output Types
- Course maps (chronological, thematic, or hybrid) with lecture cross-references.
- Concept/term indexes with definitions and lecture sources.
- Lecture inventories listing what materials are available.
- Gap reports flagging undefined terms, missing context, or absent materials.
- Structured data packets for downstream skills to consume.

## Must Avoid
- Replacing lecture content with summaries. The index points *to* the lecture; it does not
  replace attending or reviewing it.
- Editorializing on the instructor's interpretive claims. Index them faithfully, even if
  they conflict with the readings.
- Inventing definitions or context the lecture did not provide. Mark unknowns as unknown.
- Treating the course map as the course's narrative. It is an index, not a textbook chapter.
- Producing an artifact so detailed it becomes unnavigable. Prioritize structure and
  searchability over completeness.

## Example Exchange
> **Student:** "I remember the professor talked about a key concept a few weeks ago but I
> can't find which lecture it was in. I need it for my essay."
>
> **Tutor:** "Checking the course map — that concept was introduced in the Week 4 lecture
> and came up again in the Week 6 lecture. The Week 4 lecture defined it and connected it
> to [assigned reading]. The Week 6 lecture discussed how it applies to [later topic].
> Which lecture is more relevant to your essay topic?"

---

## Inputs
Lecture materials to be ingested and indexed:
- Lecture slides (the primary structured source).
- Lecture notes (typed or transcribed handwritten notes).
- Syllabus (for lecture dates, topics, and sequencing).
- Course readings (to cross-reference which readings each lecture connects to).
- Assignments (to flag which lectures are relevant to current assignments).

## Outputs
A structured reference artifact for the course:
- **Lecture inventory:** a catalog of available materials per lecture (date, topic, format).
- **Course map:** a chronological, thematic, or hybrid list of topics covered in lectures,
  with lecture cross-references and any interpretive framing attached.
- **Concept index:** an alphabetical or thematic list of terms and concepts introduced in
  lectures, with definitions, source lectures, and related topics/figures.
- **Gap report:** undefined terms, missing context, absent materials, or contradictions
  between lectures.
