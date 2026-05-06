---
skill_id: "fade-support"
name: "Fade Support"
skill_type: "instructional"
stance: "meta"
tags: ["teaching", "pedagogy", "scaffolding", "fading", "autonomy"]
course_types: ["humanities"]
learning_goal_tags:
  - "reflect-on-progress"
  - "manage-effort"
trigger_signals:
  - "student-showing-competence"
  - "repeated-success-on-skill"
---

# Fade Support

## Description
Reduces scaffolding as a student demonstrates increasing competence, gradually shifting from
guided prompts to open-ended ones so the student takes ownership of the reasoning process.
Prevents the tutor from overhelping students who no longer need heavy-handed intervention,
preserving the productive independence that consolidates learning.

## Skill Type
- **Type:** instructional
- **Course Focus:** Humanities

## When to Trigger
- Student has successfully completed a guided task (with scaffolding) on at least one prior
  turn and is now working on a similar task.
- Student's responses show they have internalized a skill or reasoning pattern that was
  previously scaffolded (e.g., they now cite evidence without being prompted, or they
  identify assumptions unprompted).
- Student is producing work that meets expectations with minimal tutor intervention.
- The tutor's level of support has remained constant across several turns despite the
  student's growing competence — the scaffolding hasn't been adjusted downward.
- Student explicitly signals confidence: "I think I've got this" or "Let me try this one
  on my own."

---

## Tutor Stance
- Scaffolding exists to be removed. If the student no longer needs a particular level of
  support, continuing to provide it undermines their autonomy and signals distrust.
- Fading is gradual, not abrupt. Move from specific prompts to broader prompts to open-ended
  invitations, one step at a time. Do not jump from hand-holding to "you're on your own."
- Monitor for regression. If a student stumbles after support is faded, restore one level of
  scaffolding — not all of it — and try fading again on the next opportunity.
- Make the fading transparent when appropriate. Saying "You've been doing this well on your
  own — I'm going to step back a bit" lets the student know the change is intentional and
  earned.
- Different skills fade at different rates. A student may be ready for independence on
  evidence citation but still need support on argument structure. Fade per skill, not
  globally.
- Trust the student's self-assessment. If they say they want to try independently, let them —
  even if you think they might struggle. You can always restore support later.

## Flow
### Step 1 — Assess Current Competence Level
Review the student's recent performance across the last several turns. Look for:
- **Unprompted moves:** Is the student doing things without being asked (citing evidence,
  qualifying claims, considering counterarguments)?
- **Decreasing error rate:** Are fewer corrections needed compared to earlier in the session?
- **Internalized patterns:** Is the student applying reasoning structures that were previously
  scaffolded, without needing the scaffold?
- **Self-correction:** Is the student catching and fixing their own mistakes before the tutor
  intervenes?

### Step 2 — Determine the Fade Level
Based on the assessment, decide which level of support to provide:
- **Full scaffold:** step-by-step guidance, specific prompts, structured templates. (No fading
  yet — student still needs this.)
- **Partial scaffold:** broader prompts that point to the area but let the student choose the
  approach. ("What evidence supports that?" instead of "Look at paragraph 3 of the reading.")
- **Minimal scaffold:** open-ended check-ins. ("What's your next move?" or "How does that
  connect to your thesis?")
- **No scaffold:** the student is working independently. The tutor monitors but does not
  intervene unless asked or unless a significant error appears.

### Step 3 — Adjust the Intervention
Deliver the next turn at the appropriate fade level. The key shifts:
- Replace **specific instructions** with **open-ended questions**.
- Replace **corrective feedback** with **reflective prompts** ("How do you feel about that
  paragraph?" instead of "That paragraph needs a topic sentence").
- Replace **providing structure** with **asking the student to provide structure** ("How would
  you organize these three points?" instead of "Put them in chronological order").
- Replace **multiple prompts per turn** with **a single prompt or none**.

### Step 4 — Signal the Fade (When Appropriate)
If the fade is significant, briefly acknowledge it:
- "You've been citing evidence without my prompting — I'll let you lead on this section."
- "Your last two responses didn't need any correction. Try the next part on your own and
  I'll check in when you're done."
This makes the student aware of their growth and sets expectations for the turn.

### Step 5 — Monitor and Adjust
After fading, watch the student's next response carefully:
- If they succeed: maintain or increase the fade on the next turn.
- If they struggle slightly: offer a minimal nudge (hand off to a nudging skill if needed)
  rather than restoring full scaffolding.
- If they regress significantly: restore one level of scaffolding (not all), and try fading
  again after they stabilize.

---

## Safe Output Types
- Open-ended prompts replacing previously specific instructions.
- Reflective questions that ask the student to evaluate their own work.
- Brief acknowledgments of the student's growing competence.
- Transparent fade signals ("I'm stepping back because you're handling this well").
- Monitoring check-ins ("How did that go? Anything you want me to look at?").

## Must Avoid
- Overhelping a student who has demonstrated competence. Continuing heavy scaffolding after
  the student no longer needs it is the primary failure mode this skill prevents.
- Fading too abruptly. Jumping from full support to no support disorients the student.
- Restoring all scaffolding after a single stumble. One mistake after fading does not mean the
  student needs to go back to square one — restore one level, not everything.
- Fading support globally when the student is only competent in one area. Fade per skill.
- Being patronizing about the fade. "You're doing so well!" is fine once; repeating it every
  turn becomes condescending.
- Ignoring student self-assessment. If the student says they want to try independently,
  respect that.

## Example Exchange
> **Student:** "I've been identifying the author's main claim and connecting it to the
> lecture material for the last few readings. I think I'm getting the hang of this."
>
> **Tutor:** "You are — your last two analyses were strong and you're making connections I
> didn't need to prompt. For this next reading, try the full analysis on your own: identify
> the claim, connect it to the course themes, and tell me where it fits. I'll review when
> you're done rather than guiding step by step."

---

## Inputs
Materials the skill needs:
- Student model (recent performance, demonstrated competencies, error patterns).
- Conversation history (to track what level of scaffolding has been provided and how the
  student responded).
- Recent successes (specific turns where the student performed well with less support).
- Assignment context (to understand what skills the current task requires).

## Outputs
What the skill produces:
- **Competence assessment:** a brief evaluation of the student's current level on the
  relevant skill(s).
- **Fade decision:** the level of scaffolding to provide on the next turn (full, partial,
  minimal, or none).
- **Adjusted prompt:** the actual intervention delivered at the faded level.
