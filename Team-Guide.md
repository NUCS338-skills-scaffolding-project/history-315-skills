# Welcome to the Skills Scaffolding Project — Team Guide

This guide walks you through everything you need to do as a course team.
Follow these steps in order and reach out to the Admin if you get stuck.

---

## Your Task Checklist

- [ ] Generate your repository from the Admin template
- [ ] Define your course-level `metadata.yaml`
- [ ] Identify your skill type (instructional or code)
- [ ] Create `skills` folders for every unique learning objective
- [ ] Write `skills.md` using the mandatory schema
- [ ] Implement `logic.py` for your skill (required for ALL skill types)
- [ ] Verify everything runs locally before pushing

---

## Step 1 — Set Up Your Repository

> Do NOT create a new repo from scratch.

1. Go to the `skill-standard-template` repo in the Organization
2. Click the green **"Use this template"** button
3. Name your repo using your course ID e.g. `course-01-skills`
4. Set the **Owner** to the Organization *(not your personal account)*
5. Click **"Create repository"**

---

## Step 2 — Create Your Course Metadata

In the root of your repo, create a file called `metadata.yaml`:

````yaml
course_id: "COURSE-01"
course_name: "Your Course Name Here"
course_type: "humanities OR cs"
spoc_contact: "admin@example.com" : 
skills_used: ["skill-name-1", "skill-name-2"]
````

> Fill in your own course ID, name, team number and course type.

---

## Step 3 — Understand Your Skill Type

This project supports **two types of skills**. 
Read carefully and identify which type applies to your course:

---

### Type 1 — Instructional Skills
**For:** Humanities, tutoring, Socratic questioning, guided learning

- Your skill is a **teaching or tutoring approach**
- `skills.md` documents the teaching flow
- `logic.py` is **required** and should support the teaching approach

**Examples: What to put in logic.py for instructional skills:**
- Text analysis *(scanning student essays for tone or complexity)*
- Response scoring *(checking if answers hit key concepts)*
- Prompt generation *(dynamically generating Socratic questions)*
- Keyword detection *(flagging when a student is off topic)*
- Progress tracking *(logging how far a student is through a skill)*

**Example skills:**
- Bound Scope *(helping students avoid overengineering)*
- Socratic Questioning *(guiding students to answers)*
- Growth Mindset Nudge *(reframing student frustration)*

---

### Type 2 — Code Skills
**For:** CS courses, reusable Python logic, algorithms, utilities

- Your skill is a **reusable Python function or module**
- `logic.py` is **required**
- `skills.md` documents how to use the code
- Focus on: inputs, outputs, usage examples, edge cases

**Example skills:**
- Sorting Algorithm *(reusable sort function)*
- Input Validator *(checks and cleans user input)*
- Graph Traversal *(BFS/DFS implementation)*

---

## Step 4 — Develop Your Skills

For **every skill** your course contributes:

### 4a — Create the Skill Folder
Inside `/skills/`, create a folder named after your skill:
/skills/your-skill-name/
### 4b — Create skills.md
Every skill needs a `skills.md`. 
The YAML header at the top is **mandatory** — your push will be rejected without it.

#### For Instructional Skills:
````yaml
---
skill_id: "skill-name"
name: "Human Readable Skill Name"
skill_type: "instructional"
tags: ["topic1", "topic2"]
python_entry: logic.py
---

# Skill Name

## Description
What does this skill do? Keep it to 2-3 sentences.

## When to Trigger
- Trigger condition 1
- Trigger condition 2

## Tutor Stance
Non-negotiable rules for how the tutor should behave.

## Flow
### Step 1 — Step Title
Describe what to do.

### Step 2 — Step Title
Describe what to do.

## Safe Output Types
What the tutor IS allowed to produce.

## Must Avoid
What the tutor must NEVER do.

## Example Exchange
> **Student:** "Example student message"
>
> **Tutor:** "Example tutor response"
````

#### For Code Skills:
````yaml
---
skill_id: "skill-name"
name: "Human Readable Skill Name"
skill_type: "code"
tags: ["topic1", "topic2"]
python_entry: "logic.py"
---

# Skill Name

## Description
What does this skill do? Keep it to 2-3 sentences.

## When to Trigger
- Trigger condition 1
- Trigger condition 2

## Inputs
Describe what inputs the function expects.

## Outputs
Describe what the function returns.

## Usage
```python
from logic import run
result = run({"key": "value"})
print(result)
```

## Notes
Any additional notes for teams importing this skill.
````

### 4c — Create logic.py (Required for ALL Skills)
Every skill regardless of type **must** include a `logic.py`.
````python
# logic.py — Reusable skill logic
# Make it modular so other teams can import it

def run(input):
    """
    Main entry point for this skill.
    :param input: dict of input parameters
    :return: result
    """
    return f"Skill executed with input: {input}"
````

> 💡 Make your functions modular and well documented
> so other teams can easily import and reuse them.

---

## Step 5 — Verify Before Pushing

Before pushing your changes, make sure:

- [ ] Your `skills.md` has the full YAML header at the very top
- [ ] `skill_type` is either `instructional` or `code`
- [ ] `skill_id` uses this format: `skill-name` (lowercase, hyphenated)
- [ ] If code skill → `logic.py` exists in the same folder
- [ ] If code skill → your Python code runs without errors locally
- [ ] Tags are relevant and descriptive

---

## Step 6 — Push Your Changes

Once everything looks good:

1. Commit your changes to the `main` branch
2. The validation rule will automatically check your `skills.md`
3. If it passes → your skill is added to the global `catalog.json`
4. Other teams can then fetch your skill using:
````bash
   python scripts/fetch_skill.py --id skill-name
````

---

## 📁 Your Repo Structure Should Look Like This

### Humanities / Instructional Team:
your-repo/
├── metadata.yaml
├── skills/
│   ├── bound-scope/
│   │   ├── skills.md
│   │   └── logic.py
│   └── socratic-questioning/
│       ├── skills.md
│       └── logic.py
└── examples/
    └── demo.py

### CS / Code Team:
your-repo/
├── metadata.yaml
├── skills/
│   ├── sorting-algorithm/
│   │   ├── skills.md
│   │   └── logic.py
│   └── input-validator/
│       ├── skills.md
│       └── logic.py
└── examples/
└── demo.py

---

## Common Issues

| Problem | Fix |
|---------|-----|
| Push rejected | Check your `skills.md` has all required YAML fields |
| Invalid skill_type error | Must be exactly `instructional` or `code` |
| Missing logic.py error | Code skills must include a `logic.py` file |
| Skill not in catalog | Make sure you pushed to `main` not another branch |
| Can't find template | Make sure you accepted your Organization invite email |
| YAML header not working | Make sure `---` is the very first line of the file |

---

## Need Help?
Reachout to us!!
