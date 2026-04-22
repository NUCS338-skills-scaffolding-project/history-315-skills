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
