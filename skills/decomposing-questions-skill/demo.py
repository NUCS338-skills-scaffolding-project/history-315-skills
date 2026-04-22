"""
================================================================================
DECOMPOSING QUESTIONS SKILL — Example Exchange
================================================================================

Assumption: the agent has full access to HIST-315's class materials —
course readings (Perlstein, Self, Cowie, Rodgers), lecture slides, lecture
notes, the syllabus, and the Midterm Essay assignment sheet.

--------------------------------------------------------------------------------
TURN 1
--------------------------------------------------------------------------------
STUDENT:
"I just got the midterm prompt and I'm stuck before I even start. It says:
'Assess how the Reagan administration reshaped the relationship between the
federal government and the states from 1981 to 1989, and compare this shift
to the federalism Nixon practiced during his first term.' That feels like
three prompts in one. Where do I even begin?"

AGENT:
"Before anything else, let's pull out the task verbs. Underline every verb
that tells you what to do. What do you see, and which one do you think is
primary?"

--------------------------------------------------------------------------------
TURN 2
--------------------------------------------------------------------------------
STUDENT:
"'Assess' and 'compare.' Assess feels like the main one — the compare is
how I support it?"

AGENT:
"Good. Assess is primary (you're making a judgment), compare is the
evidence you use. Now the subjects: 'Reagan administration' and 'Nixon's
first term' are obvious, but the prompt also says 'the relationship between
the federal government and the states.' What does that actually refer to?"

--------------------------------------------------------------------------------
TURN 3
--------------------------------------------------------------------------------
STUDENT:
"I guess... how much power the federal government has over the states?"

AGENT:
"Too broad to write. Pin it down. Is this about funding (block grants vs.
categorical grants)? Regulation (who sets environmental or welfare rules)?
Fiscal authority (revenue sharing, tax policy)? Pick the ones you can
actually find in Self and Perlstein."

--------------------------------------------------------------------------------
TURN 4
--------------------------------------------------------------------------------
STUDENT:
"Funding and regulation, mainly. Block grants and deregulation for Reagan,
Revenue Sharing for Nixon."

AGENT:
"Now we have a real subject. Two more things. One: what counts as
'reshaping' vs. just 'changing'? That's the word you have to defend. Two:
what hidden sub-questions are inside this prompt that you haven't answered
yet?"

--------------------------------------------------------------------------------
TURN 5
--------------------------------------------------------------------------------
STUDENT:
"Sub-questions... whether Reagan and Nixon were doing the same thing or
different things? Whether the changes actually lasted? Whether I'm judging
by intent or by outcome?"

AGENT:
"Exactly the three you need. Here's the decomposition to take into the
Causal Chains skill:

  Task verbs:    assess (primary), compare (secondary)
  Subjects:      Reagan 1981–89, Nixon 1969–73, federal funding + regulation
  Timeframe:     1981–89 vs. 1969–73
  Sub-questions: (1) same project or different? (2) durable or reversed?
                 (3) judging by intent or outcome?
  Flag:          'Reshape' needs a criterion. Commit to one before you draft.

Next step: run this through the Causal Chains skill to map how the policy
mechanisms actually changed the federal-state relationship."
"""

# demo.py — Example usage of the skill
import sys
sys.path.append("../skills/example-skill")
from logic import run

result = run({"key": "value"})
print(result)
