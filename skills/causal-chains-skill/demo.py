"""
================================================================================
CAUSAL CHAINS SKILL — Example Exchange
================================================================================

Assumption: the agent has full access to HIST-315's class materials — Carter's
"Crisis of Confidence" speech, Kalman's *Right Star Rising*, Perlstein's
*The Invisible Bridge*, Cowie's *Stayin' Alive*, lecture slides on stagflation
and the 1980 election, lecture notes, and the final-paper prompt.

--------------------------------------------------------------------------------
TURN 1
--------------------------------------------------------------------------------
STUDENT:
"I want to argue that the 1979 oil shock caused Carter to lose the 1980
election. We spent a whole week on stagflation in lecture so it feels like
the clearest cause. Can you help me set up the chain?"

AGENT:
"'Caused' is doing too much work across an 18-month gap. Before we build
anything, name the single event you're actually explaining. Is it Carter
losing, Reagan winning, or the realignment that both are part of?"

--------------------------------------------------------------------------------
TURN 2
--------------------------------------------------------------------------------
STUDENT:
"Carter losing, specifically. Reagan's win is a consequence of that."

AGENT:
"Good — that's the focal event. Now separate two layers of cause. Which
things in your argument are *preconditions* (structural, long-running,
made a Carter loss possible) vs. *triggers* (happened in 1979–80 and set
it off)? Put the oil shock in one."

--------------------------------------------------------------------------------
TURN 3
--------------------------------------------------------------------------------
STUDENT:
"Oil shock is a trigger. Preconditions would be... the collapse of the
postwar Keynesian consensus? The rise of the New Right? Those were
building for a decade."

AGENT:
"Right. That leaves a gap: the oil shock didn't hand Reagan the election
by itself. What carried it forward into November 1980? Name one actor or
event, not 'the economy.'"

--------------------------------------------------------------------------------
TURN 4
--------------------------------------------------------------------------------
STUDENT:
"Volcker raising interest rates to 20% in October 1979. And the Iran
hostage crisis — the rescue attempt failed in April 1980."

AGENT:
"Now you have mechanism. Your chain:
  Precondition → consensus collapse, New Right infrastructure
  Trigger      → 1979 oil shock, Iran hostages
  Amplifier    → Volcker shock, failed rescue, Kennedy primary
  Event        → Reagan 489–49

One weak link left: 'stagflation broke the postwar consensus.' Through
whom? Name an institution or person."

--------------------------------------------------------------------------------
TURN 5
--------------------------------------------------------------------------------
STUDENT:
"Through Friedman and the supply-siders, carried into policy by AEI,
Heritage, and the Kemp-Roth bill?"

AGENT:
"That's defensible from Kalman. Your chain holds. One last test: if the
hostages had come home in June, does Reagan still win? If yes, the oil
shock is load-bearing; if no, the hostage crisis is. Pick one arrow as
your paper's spine — you can't defend both fully in ~8 pages."

--------------------------------------------------------------------------------
TURN 6
--------------------------------------------------------------------------------
STUDENT:
"Probably still wins — the inflation was worse. I'll make oil shock →
Volcker → incumbent-blame the spine."

AGENT:
"Good call. Take that spine to the Assumption Validation skill next, because
'the public blamed Carter for inflation' is a claim that sounds obvious but
isn't. You'll want to cite polling, not assert it."
"""

# demo.py — Example usage of the skill
import sys
sys.path.append("../skills/example-skill")
from logic import run

result = run({"key": "value"})
print(result)
