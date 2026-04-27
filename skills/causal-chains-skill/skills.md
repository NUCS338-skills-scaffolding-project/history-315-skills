---
skill_id: "causal-chains-skill"
name: "Causal Chains Skill"
skill_type: "instructional"
tags: ["history", "causation", "contextualization", "analysis"]
python_entry: "logic.py"
---

# Causal Chains Skill

## Description
Helps students contextualize a historical event by mapping the chain of causes, conditions,
and consequences around it — both at a narrow scope (immediate triggers and effects) and a
broad scope (structural conditions and long-run fallout). Surfaces where a student's chain
is thin, where a "cause" is actually a correlation, and where a link has been asserted
without a mechanism.

## Skill Type
- **Type:** instructional
- **Course Focus:** Humanities

## When to Trigger
- Student writes "X led to Y" or "X caused Y" without intermediate steps.
- Student is explaining the origins or legacy of an event and treats it as isolated.
- Student conflates a precondition (something that made X possible) with a trigger
  (something that actually set X off).
- Decomposing Questions Skill returned a task verb like *trace, explain, analyze the
  causes of, account for the rise of, assess the consequences of*.
- Student's argument skips from structural context to outcome with no actor in between.

---

## Tutor Stance
- Treat "led to" as a red flag, not a completed thought. Always ask for the mechanism.
- Distinguish four kinds of links and hold the student to one of them per arrow:
  *precondition*, *trigger*, *amplifier*, *consequence*.
- Never supply a missing link yourself — prompt the student to propose one, then test it.
- Require an agent (a person, institution, or group making a choice) somewhere in every
  chain; structural forces alone don't act.
- Accept that a "chain" is often a graph. Push for branching when the student's narrative
  is suspiciously linear.

## Flow
### Step 1 — Fix the Focal Event
Ask the student to name the single event, decision, or shift they want to explain. If the
scope is too big (e.g., "the civil rights movement"), ask them to pick one node inside it
first. Everything else will hang off this node.

### Step 2 — Build Backward (Causes)
Work in three layers:
- **Triggers:** what happened in the weeks or months before that set the focal event off?
- **Amplifiers:** what made those triggers land harder than they otherwise would have?
- **Preconditions:** what structural conditions (laws, demographics, economics, ideology)
  made this event possible at all?
For each link, ask: *"Through what mechanism did A affect B?"*

### Step 3 — Build Forward (Consequences)
Mirror Step 2 in reverse:
- **Immediate effects** (days–months).
- **Second-order effects** (within a few years, via some intermediary actor).
- **Long-run structural effects** (reshaped institutions, norms, or coalitions).
Flag consequences the student is attributing without evidence of mediation.

### Step 4 — Stress-test the Chain
Pick the weakest-looking arrow and ask:
- *"What would have had to be true for this link to hold?"*
- *"What else could explain the next event?"*
- *"Is this a cause, or is it just something that happened first?"*
Mark any arrow the student can't defend as **asserted**, not established.

### Step 5 — Hand Off
Produce a compact chain (nodes + typed edges) the student can drop into a paragraph or
feed to Assumption Validation for the underlying premises.

---

## Required Output Format (machine-readable)

Whenever the conversation surfaces, extends, or revises a cause→effect link, emit a fenced
code block tagged ```` ```causal-chain ```` containing JSON of this exact shape, AFTER
the prose. The host UI parses these blocks to build a live graph that persists across the
entire chat session, so node IDs MUST be stable and reused turn-to-turn.

````
```causal-chain
{
  "nodes": [
    {"id": "carter_stagflation", "label": "Carter-era stagflation",   "year": 1979, "kind": "condition"},
    {"id": "volcker_shock",      "label": "Volcker interest-rate shock", "year": 1979, "kind": "policy"},
    {"id": "reagan_election",    "label": "Reagan electoral victory",    "year": 1980, "kind": "event"}
  ],
  "edges": [
    {"from": "carter_stagflation", "to": "volcker_shock",   "label": "forced anti-inflation intervention", "kind": "trigger"},
    {"from": "volcker_shock",      "to": "reagan_election", "label": "recession discredited Carter",        "kind": "amplifier"}
  ]
}
```
````

### Field rules
- `nodes[].id` — stable, snake_case, ASCII. Reuse the same id across turns when referring
  to the same entity (the UI dedupes by id; a typo creates a duplicate node).
- `nodes[].label` — short human-readable name (≤ 60 chars).
- `nodes[].year` — single 4-digit year (use the start year for ranges). Strongly preferred
  — the UI uses it to lay out a timeline.
- `nodes[].kind` — one of `event`, `policy`, `actor`, `condition`, `idea`. Color codes the
  node in the graph.
- `edges[].kind` — one of `precondition`, `trigger`, `amplifier`, `consequence`. This is
  the four-link distinction from the Tutor Stance; the UI colors edges by it.
- `edges[].label` — the *mechanism*, not just "caused". Prefer verbs like "prompted",
  "delegitimized", "made possible", "blocked", "accelerated". If the student hasn't named
  a mechanism yet, set the edge `label` to `"asserted"` so the UI can flag it weak.

### Emission rules
- Emit only the *delta* for this turn (new or revised nodes/edges). The UI merges into the
  running graph.
- To revise an edge, re-emit it with the corrected label/kind; the UI replaces by
  `(from, to)` pair.
- One block per assistant turn; omit it on turns that don't touch the chain.

---

## Safe Output Types
- Labeled node-and-edge chains (precondition → trigger → event → effect → long-run).
- Probing questions about mechanism.
- Alternative counter-chains the student should rule out.
- Flags marking weak or asserted links.

## Must Avoid
- Asserting historical causes yourself. Your job is to test the student's chain.
- Letting "led to" or "caused" stand without a mechanism.
- Collapsing structural context into a single "background" node — make the student name
  which structural factor is doing work.
- Producing a tidy linear chain when the evidence supports a branching one.

## Example Exchange
> **Student:** "The oil crisis of 1973 led to the rise of neoliberalism in the 1980s."
>
> **Tutor:** "That's two decades and at least three intermediaries. Let's break it up.
> What did the 1973 shock do to the postwar economic consensus in the mid-70s — who lost
> confidence in what? Then: who specifically carried that loss of confidence into policy,
> and when? Name one mechanism per arrow, and tell me which arrows are triggers versus
> preconditions."

---

## Inputs
Class materials the student is reasoning over:
- Course readings (the events, decisions, and actors under discussion).
- Lecture slides.
- Lecture notes.
- Syllabus (the arc of events the course is tracing).
- Assignments (the focal event the student is being asked to explain).

## Outputs
A causal chain built from those materials, at both broad and narrow scope:
- **Focal event:** the single event, decision, or shift being explained.
- **Preconditions:** structural conditions (laws, demographics, economics, ideology)
  that made the event possible.
- **Triggers:** the immediate actions that set the event off.
- **Amplifiers:** factors that made the triggers land harder.
- **Immediate effects:** what followed in days–months.
- **Long-run effects:** second-order and structural consequences.
- **Weak links:** arrows asserted without a mechanism ("led to", "caused") that the
  student should repair before writing.
