"""
================================================================================
ASSUMPTION VALIDATION SKILL — Example Exchange
================================================================================

Assumption: the agent has full access to HIST-315's class materials — Self's
*All in the Family*, Kruse's *White Flight*, Sugrue's *The Origins of the
Urban Crisis*, Cowie's *Stayin' Alive*, Perlstein, the syllabus, lecture
slides on the Silent Majority and liberalism's decline, and the Response
Paper #3 assignment.

--------------------------------------------------------------------------------
TURN 1
--------------------------------------------------------------------------------
STUDENT:
"My TA keeps writing 'according to whom?' in the margins. Here's the
paragraph:

  'In the 1970s, Americans became deeply disillusioned with the federal
  government. Obviously, Watergate and Vietnam destroyed public trust,
  which is why the New Right was able to capture the Republican Party by
  the end of the decade. Everyone believed by 1980 that liberalism had
  failed. The Silent Majority finally spoke.'

What is she seeing that I'm not?"

AGENT:
"Start with the first sentence. 'Americans became deeply disillusioned.'
Who are 'Americans' here? Self and Sugrue both show disillusionment was
sharply split by race, class, and geography. Can you name a specific
public?"

--------------------------------------------------------------------------------
TURN 2
--------------------------------------------------------------------------------
STUDENT:
"I guess I mean white suburban voters, mostly. That's who Kruse is about."

AGENT:
"Much better. Now the next claim: 'Watergate and Vietnam destroyed public
trust.' The ANES polling we looked at in lecture shows trust started
falling in the mid-1960s, before Watergate. Is 'destroyed' defensible, or
do you need a weaker verb?"

--------------------------------------------------------------------------------
TURN 3
--------------------------------------------------------------------------------
STUDENT:
"Accelerated? Or crystallized? I remember the 1974 trough was a deepening,
not a start."

AGENT:
"'Accelerated' works if you cite the ANES series. Now the clause I want you
to look at hardest: 'which is why the New Right was able to capture the
Republican Party.' That 'which is why' is doing the work of the entire
course. Is that a throwaway clause or your actual argument?"

--------------------------------------------------------------------------------
TURN 4
--------------------------------------------------------------------------------
STUDENT:
"...oh. That's basically the Kruse + Self + McGirr argument. It shouldn't
be a subordinate clause."

AGENT:
"Right. Either promote it to your thesis and defend it with those three,
or narrow it — e.g., 'contributed to' instead of 'is why.' You can't have
it both ways. Which way are you going?"

--------------------------------------------------------------------------------
TURN 5
--------------------------------------------------------------------------------
STUDENT:
"Narrow it for now. My thesis is already about disillusionment, not GOP
capture. What about 'Everyone believed' and 'Silent Majority'?"

AGENT:
"'Everyone' — 41% still voted Carter or Anderson in 1980. Drop it. 'Silent
Majority' is Nixon's 1969 slogan, not a neutral category; put it in quotes
and attribute it, or cut it. Analysts don't adopt their subjects' phrases
unguarded."

--------------------------------------------------------------------------------
TURN 6
--------------------------------------------------------------------------------
STUDENT:
"Okay. Fixes: white suburban voters + accelerated + 'contributed to' + drop
'everyone' + quote 'Silent Majority' and attribute to Nixon. Good?"

AGENT:
"Good. Re-run this skill on the revision — repairing the monolithic
subject usually forces downstream sentences to change, and you want to
catch that before your TA does."
"""

# demo.py — Example usage of the skill
import sys
sys.path.append("../skills/example-skill")
from logic import run

result = run({"key": "value"})
print(result)
