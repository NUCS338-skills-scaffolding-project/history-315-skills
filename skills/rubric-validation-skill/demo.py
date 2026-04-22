"""
================================================================================
RUBRIC VALIDATION SKILL — Example Exchange
================================================================================

Assumption: the agent has full access to HIST-315's class materials — the
syllabus, the final-paper prompt and rubric, the student's current draft,
and the course readings (for this example: Patterson's *Restless Giant*,
Kruse's *One Nation Under God*, and LBJ's March 1965 address to Congress,
all on the student's source list).

--------------------------------------------------------------------------------
TURN 1
--------------------------------------------------------------------------------
STUDENT:
"My Great Society paper technically hits every rubric line — thesis, four
sources (one primary), organized, clean prose — but when I read it aloud
it feels like a book report with a thesis glued on. I have one day. I
don't want to rewrite. Here's the opening:

  'The Great Society achieved lasting change in American life. It somewhat
  reshaped healthcare through Medicare, and arguably shifted the
  relationship between citizens and the federal government. In some ways
  these programs mattered, though perhaps not as much as their architects
  hoped.'"

AGENT:
"Floor check first. Does every rubric row hold at your target band — not
just 'present'?"

--------------------------------------------------------------------------------
TURN 2
--------------------------------------------------------------------------------
STUDENT:
"Yeah, I'm hitting every row. I just don't think it's actually good."

AGENT:
"Then the rubric is the floor, not the ceiling. Count the hedges in your
first three sentences. What do you see?"

--------------------------------------------------------------------------------
TURN 3
--------------------------------------------------------------------------------
STUDENT:
"'Somewhat,' 'arguably,' 'in some ways,' 'perhaps.' Four hedges in three
sentences."

AGENT:
"Hedges should mark real uncertainty, not soften claims you want to make.
Strip 'somewhat' and 'in some ways'; keep 'arguably' if that claim is
genuinely contested. Separately — the prompt asks you to engage with
competing interpretations. Do you?"

--------------------------------------------------------------------------------
TURN 4
--------------------------------------------------------------------------------
STUDENT:
"Not really. I have Patterson and Kruse on my source list but I don't
put them in conversation."

AGENT:
"They're two schools: Patterson reads the Great Society as succeeding but
abandoned; Kruse reads it as provoking its own backlash. Add one sentence
after your thesis naming which side you're on and why. That's the single
biggest lift available to this paper."

--------------------------------------------------------------------------------
TURN 5
--------------------------------------------------------------------------------
STUDENT:
"I have about a day. Can I do both — the hedges and the historiography?"

AGENT:
"Historiography move first. It's the highest leverage and the prompt
explicitly rewards it. Hedges take ten minutes after. A third move —
swapping one generalization for a specific moment from the LBJ address —
only if you finish the first two."

--------------------------------------------------------------------------------
TURN 6
--------------------------------------------------------------------------------
STUDENT:
"Got it. Historiography sentence, then hedges, then maybe LBJ. Anything
threaten the rubric floor?"

AGENT:
"None of these do. Adding the historiography sentence actually strengthens
Thesis & Argument. When you have the revised intro, run it through
Assumption Validation — the sentence that names a historiographical debate
is exactly the kind of claim that can overreach."
"""

# demo.py — Example usage of the skill
import sys
sys.path.append("../skills/example-skill")
from logic import run

result = run({"key": "value"})
print(result)
