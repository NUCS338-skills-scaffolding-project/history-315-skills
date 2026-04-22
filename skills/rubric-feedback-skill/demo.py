"""
================================================================================
RUBRIC FEEDBACK SKILL — Example Exchange
================================================================================

Assumption: the agent has full access to HIST-315's class materials — the
syllabus, the final-paper assignment sheet with its rubric, lecture slides,
and the course readings the paper is expected to engage with.

--------------------------------------------------------------------------------
TURN 1
--------------------------------------------------------------------------------
STUDENT:
"I got the rubric for the final paper and I can't tell what it's asking for.
Some rows feel identical, some feel like they measure nothing I can do. The
rubric has four rows (Thesis 30%, Sources 25%, Historical Voice 20%,
Structure 15%) plus Mechanics with no weight, and the band descriptors are
things like 'strong voice' vs. 'weak voice.' Can you help me write something
to the professor?"

AGENT:
"Before we draft anything, tell me the one criterion you can't act on. What
specifically can't you tell would move you from a B to an A?"

--------------------------------------------------------------------------------
TURN 2
--------------------------------------------------------------------------------
STUDENT:
"Historical Voice. 'Strong' vs. 'developing' vs. 'weak' — I can't tell what
the observable difference is."

AGENT:
"That's a clarity issue — unanchored descriptors. Good to flag. Is that
your only issue, or are there structural problems too?"

--------------------------------------------------------------------------------
TURN 3
--------------------------------------------------------------------------------
STUDENT:
"Mechanics has no weight, and the other four only add up to 90%. Also
Thesis A says 'sophisticated' and B says 'clear with good argument' — same
problem as Historical Voice."

AGENT:
"Three issues now: unanchored Voice, unanchored Thesis A/B, missing
Mechanics weight. One more check — does the rubric cover everything the
prompt requires?"

--------------------------------------------------------------------------------
TURN 4
--------------------------------------------------------------------------------
STUDENT:
"The prompt says we have to 'engage with at least two competing historical
interpretations.' I don't see that anywhere in the rubric."

AGENT:
"That's a coverage gap — a prompt requirement invisible at grading. That's
the most important one because a student could hit the rubric and still
miss the prompt. Ready to draft the memo?"

--------------------------------------------------------------------------------
TURN 5
--------------------------------------------------------------------------------
STUDENT:
"Yes, short and professional if possible."

AGENT:
"Here's a draft you can send:

  Dear Professor,

  A few places where the rubric is hard for me to act on, raised in the
  hope it helps target effort:

  • 'Strong / developing / weak historical voice' — the bands differ only
    by degree adverb. An anchor (e.g., 'uses period-appropriate vocabulary,
    engages genre of a primary source, resists presentism') would make the
    ladder climbable.
  • Thesis A ('sophisticated') and B ('clear with good argument') have the
    same ambiguity. Could the A band tie to the prompt's
    counter-interpretation requirement?
  • Mechanics has no weight, and the stated weights sum to 90%.
  • The prompt requires engagement with 'two competing historical
    interpretations' but the rubric doesn't visibly measure this. Could
    it be folded into Thesis or added as its own row?

  Thank you for considering.
  — [name]

Tone is diagnostic, not adversarial. Want to adjust anything before
sending?"

--------------------------------------------------------------------------------
TURN 6
--------------------------------------------------------------------------------
STUDENT:
"That's good. If the rubric doesn't change in time, what do I do?"

AGENT:
"Hand your draft to the Rubric Validation skill. It treats the rubric as
the floor and helps you do the historiography move the prompt is asking
for, even if the rubric never explicitly scores it."
"""

# demo.py — Example usage of the skill
import sys
sys.path.append("../skills/example-skill")
from logic import run

result = run({"key": "value"})
print(result)
