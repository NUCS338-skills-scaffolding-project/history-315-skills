"""Prompts for the four-phase build pipeline."""

from __future__ import annotations

from pathlib import Path


# ---------------------------------------------------------------------------
# Phase 1 — PLAN
# ---------------------------------------------------------------------------

PLAN_SYSTEM_PROMPT = """You are planning the extraction of an exhaustive \
knowledge graph for **History 315: The United States Since 1968** at \
Northwestern.

You will read the course's organizational documents and propose 8-15 \
top-level "domains" that organize everything in `course-materials/`. The \
graph that gets built from your plan will let students browse the whole \
course as a tree.

Be thorough. Every lecture and every required reading must be assigned to \
at least one domain. Domains can have overlap; better to assign a source \
to two domains than to leave it out.

## File-writing rules (NON-NEGOTIABLE)
- ALWAYS use the **Write** tool to create the output file. The output \
path will not exist when you start; Write will create it.
- If Write somehow fails, retry Write **once**. Do NOT fall back to Bash \
heredocs (`<<'EOF'`, `cat > file`, etc.) — those routinely hit \
shell-quoting bugs and waste the run. Just report the error and stop.
- Do NOT use Edit on files you haven't created — use Write.
- Do NOT echo the JSON to stdout. The file is the only output that matters.

Return ONLY valid JSON written to the path the user specifies. No prose, \
no markdown fences."""


def plan_user_prompt(out_path: Path) -> str:
    return f"""Steps (be efficient — keep total context use under 100K tokens):

1. Use **Glob** to list files in:
     - course-materials/Lecture Notes/
     - course-materials/Readings/
     - course-materials/Rubrics/
   Don't Read these files in this phase — just collect their names.

2. **Read** course-materials/History 315-3 FQ24.pdf with the \
`pages` parameter set to "1-15" (the syllabus is short — the front \
material covers the course arc and weekly schedule).

3. **Read** course-materials/Reading History.pdf (it's small — full file \
is fine).

4. **Do NOT Read** the Gerstle textbook \
(course-materials/Gary Gerstle - The Rise and Fall of the Neoliberal \
Order_*.pdf). It's 4MB and would overflow context. You can infer chapter \
themes from the syllabus's weekly schedule.

Then write a JSON file at:
  {out_path}

with this exact shape:
{{
  "domains": [
    {{
      "id": "snake_case_id",
      "label": "Human-readable domain name (≤ 60 chars)",
      "description": "2-3 sentence description of this domain.",
      "year_range": [start_year, end_year],
      "assigned_sources": [
        "course-materials/Lecture Notes/Oct 1 Lecture.pdf",
        "course-materials/Readings/Borstelman More Less Equal.pdf"
      ]
    }},
    ...
  ]
}}

Coverage rule (mandatory): every file under course-materials/Lecture Notes/ \
and course-materials/Readings/ must appear in at least one domain's \
assigned_sources. Use the syllabus to map weeks → topics.

Use your Write tool to create the file. Do not output the JSON to stdout — \
only output a one-line confirmation that you wrote N domains."""


# ---------------------------------------------------------------------------
# Phase 2 — EXTRACT (fan-out via Task tool)
# ---------------------------------------------------------------------------

EXTRACT_SYSTEM_PROMPT = """You are the orchestrator of an exhaustive \
knowledge-graph extraction for History 315. Your job is to spawn one \
subagent per domain (using the Task tool) and let each one build out its \
subtree in parallel.

Be aggressive about coverage. The students using this graph want to find \
*everything* the course covers — so subagents should err on the side of \
including more nodes, going deeper, and adding more relationships.

## File-writing rules (NON-NEGOTIABLE — pass these to every subagent)
- Subagents MUST use the **Write** tool for their output file. Write will \
create it; the file does not exist beforehand.
- If Write fails, retry Write **once**. Never fall back to Bash heredocs \
(`<<'EOF'`, `cat > file`) — they hit shell-quoting bugs and waste the run.
- Do NOT echo extracted JSON to stdout — only the file matters.

Return ONLY a brief one-line confirmation when all subagents are done. \
Do not output any of the extracted JSON to stdout."""


_SUBAGENT_TEMPLATE = """You are extracting the FULL subtree under the \
"{label}" domain of History 315.

Domain:
  id:          {id}
  label:       {label}
  description: {description}
  year_range:  {year_range}

Assigned sources (read each one):
{sources_block}

Context discipline (CRITICAL):
- Lecture notes and short readings: Read normally.
- For files larger than ~1MB (rare in Lecture Notes/, common for Gerstle): \
use Read with the `pages` parameter to read in 10-20 page chunks. **Never \
Read the Gerstle textbook in full** — it will blow your 200K context. \
If the textbook is in your assigned_sources, read only the chapter pages \
relevant to your domain (the syllabus weekly schedule tells you which).
- After reading each source, immediately extract its key items and add \
them to your in-memory tree. You don't need every source open at once.
- Aim to keep total context use under ~150K tokens.

Steps:
1. Read each assigned source under the discipline above. Don't summarize \
— extract.
2. Identify everything notable: events, sub-events, people, groups, \
policies, laws, court cases, ideas, concepts, vocabulary terms, primary \
sources. Be EXHAUSTIVE — err on the side of including more.
3. Organize them into a tree of arbitrary depth, rooted at this domain:
   - The domain itself is the root (level 1, parent_id: null).
   - Direct children might be sub-eras, major events, or themes (level 2).
   - Their children might be sub-events, key figures, or specific ideas \
(level 3).
   - Continue deeper wherever it makes sense — a single event can have \
its own people / conditions / consequences as children. A person can have \
their key writings or ideas. There is NO depth limit.
   - Mark a node `"is_leaf": true` only when it's truly atomic (a single \
vocab term, a single date, a single quote — nothing useful below it).
4. Every non-leaf must have children.
5. **Edges — be DENSE.** Sparse graphs are useless to students. Every \
non-trivial node should have **at least 3 outgoing edges** to other \
nodes in your subtree, when historically defensible. Leaves can have \
fewer. It is far better to over-emit and let a downstream pass tighten \
than to under-emit. Use these `kind` values:
     - precondition  (A made B possible / set the stage)
     - trigger       (A actively set B off)
     - amplifier     (A made B land harder / faster)
     - consequence   (B followed directly from A)
     - related       (general connection, no single label fits)
     - context       (A is the historical setting B happens inside)
     - compare       (A and B follow a similar pattern / parallel)
     - contrast      (A is a counter-example / opposing case to B)
     - temporal      (A and B are close in time, no explicit causation)
     - thematic      (A and B share an idea, motif, or recurring concept)
   The edge `label` is the *mechanism* (verb phrase like "discredited" or \
"forced anti-inflation intervention"), not the word "caused". For \
non-causal kinds (context, compare, contrast, thematic) the label is the \
nature of the connection ("same coalition fracture", "Cold War \
backdrop"). When the connection is real but the mechanism isn't \
obvious, set `label: "asserted"` and the UI will flag it for review.

   **Worked example.** A node `volcker_shock` should have edges like:
     {{from: "stagflation", to: "volcker_shock", kind: "trigger", label: "forced anti-inflation intervention"}}
     {{from: "volcker_shock", to: "early_80s_recession", kind: "consequence", label: "induced sharp recession"}}
     {{from: "volcker_shock", to: "reagan_election", kind: "amplifier", label: "discredited Carter Democrats"}}
     {{from: "monetarism", to: "volcker_shock", kind: "context", label: "intellectual frame for the policy"}}
   Four edges, three different kinds. Aim for this density.
6. Use snake_case node ids. Prefix with the domain id when ambiguous \
(e.g. `{id}__beyond_vietnam_speech`) so ids are globally unique.

Schema for each node:
  id, parent_id, label, description (1-3 sentences), kind \
(era|theme|topic|event|sub_event|person|group|policy|law|court_case|idea\
|concept|term|movement|reading|lecture|source|document), year (int or \
null), year_range ([int,int] or null), level (int), source_refs (array of \
relative paths), is_leaf (bool).

Schema for each edge:
  from, to, label, kind, description (optional, 1 sentence on the \
mechanism if non-obvious).

Write your output to:
  catalog/build/extraction/{id}.json

with this exact shape:
{{
  "domain_id": "{id}",
  "nodes":  [ ... ],
  "edges":  [ ... ]
}}

## File-writing rules (NON-NEGOTIABLE)
- Use your **Write** tool. The file does not exist beforehand; Write will \
create it.
- If Write fails, retry Write **once**, then stop. Never use Bash heredocs \
(`<<'EOF'`, `cat > file`) — those waste the run on quoting bugs.
- Do NOT echo extracted JSON to stdout.

Quality bar: another agent will review your work and add anything you \
missed. Aim to leave them very little. Output ONLY a one-line \
confirmation when done."""


def extract_user_prompt(plan_path: Path, out_dir: Path, concurrency: int) -> str:
    return f"""1. Read the extraction plan at:
  {plan_path}

2. For EACH domain in the plan, spawn a subagent using your Task tool. \
The subagent's prompt is the template below — fill in the placeholders \
({{id}}, {{label}}, {{description}}, {{year_range}}, {{sources_block}}) \
from each domain's plan entry. The {{sources_block}} should be the \
assigned_sources list as a bulleted markdown list.

3. Run up to {concurrency} subagents concurrently. When you've reached \
the cap, wait for one to finish before starting the next.

4. Each subagent writes its output to:
  {out_dir}/<domain_id>.json

5. When ALL subagents have completed, write the marker file:
  catalog/build/extraction_done.marker  (an empty file is fine)

Output ONLY a one-line confirmation summarising how many domains were \
processed.

--- BEGIN SUBAGENT PROMPT TEMPLATE ---
{_SUBAGENT_TEMPLATE}
--- END SUBAGENT PROMPT TEMPLATE ---"""


# ---------------------------------------------------------------------------
# Phase 3 — REVIEW
# ---------------------------------------------------------------------------

REVIEW_SYSTEM_PROMPT = """You are reviewing an exhaustive knowledge-graph \
extraction for History 315. Your job is to find what the extraction \
missed: notable entities, edges (relationships), or whole subtrees that \
deserve to exist but don't.

In practice, subagents under-emit edges. When you spawn review subagents, \
**instruct them to spend at least half their attention on edges**, not \
just nodes. Look for: cross-cutting connections (a person who shows up in \
two domains), pre/postcondition pairs that lack their bridge, contrasts \
and parallels between events, and thematic threads that aren't yet linked.

Spawn one subagent per top-level domain via Task. Each subagent:
- Reads the relevant source files for its domain.
- Reads the current DB summary you'll be given.
- Identifies missing nodes, missing edges, or under-expanded subtrees.

## File-writing rules (NON-NEGOTIABLE)
- Use the **Write** tool. The output file does not exist beforehand.
- If Write fails, retry Write **once**, then stop. NEVER use Bash heredocs.
- For PDFs over 1MB, use the `pages` parameter on Read; never load the \
Gerstle textbook in full.

Aggregate the subagent results and write a single review.json file. \
Output ONLY a one-line confirmation."""


def review_user_prompt(summary_path: Path, out_path: Path) -> str:
    return f"""1. Read the current catalog DB summary at:
  {summary_path}
   (It's one line per node: id | level | breadcrumb | source files.)

2. For each top-level domain in the summary, spawn a Task subagent that \
re-reads that domain's source materials looking for what's missing:
  (a) entities that aren't in the DB but should be (notable people, \
events, policies, ideas, vocab terms);
  (b) edges (relationships) that aren't in the DB but should be;
  (c) nodes that exist but should have children (under-expanded — a \
non-leaf with no descendants).

3. Aggregate the subagent results and write a single JSON file to:
  {out_path}

with this shape:
{{
  "additions": {{
    "nodes": [ {{ id, parent_id, label, description, kind, year, \
year_range, level, source_refs, is_leaf }}, ... ],
    "edges": [ {{ from, to, label, kind, description }}, ... ]
  }},
  "expansions": [
    {{ "node_id": "id_of_node_to_expand",
       "new_children": [ {{...node fields...}}, ... ] }},
    ...
  ]
}}

Use the same id conventions, kind enums, and edge kinds as the original \
extraction. Output ONLY a one-line confirmation."""


# ---------------------------------------------------------------------------
# Phase 4 — DENSIFY (per-domain edge enrichment)
# ---------------------------------------------------------------------------

DENSIFY_SYSTEM_PROMPT = """You are an edge-densification pass on an \
existing knowledge graph for History 315.

You will be given a list of nodes (by id, label, kind, year, breadcrumb, \
description) belonging to a single domain. Your one job: propose \
**additional edges** between those nodes that aren't already in the \
graph, so that students browsing this domain see lots of connections.

Rules:
- DO NOT propose new nodes. Only edges.
- Use only the node ids from the list provided.
- Edge `kind` ∈ {{precondition, trigger, amplifier, consequence, related, \
context, compare, contrast, temporal, thematic}}.
- `label` is the *mechanism* or nature of the connection (verb phrase or \
short noun phrase). Avoid the bare word "caused".
- Be generous. Aim to add 2-5x as many edges as the current graph has \
within this domain. Cross-cutting connections (an event under era X that \
prefigures something under era Y) are especially valuable.

## File-writing rules (NON-NEGOTIABLE)
- Use the **Write** tool to create the output file. It does not exist \
beforehand.
- If Write fails, retry Write **once**, then stop. NEVER use Bash heredocs.

Output ONLY valid JSON to the path you're given. No prose, no markdown \
fences."""


def densify_user_prompt(domain_id: str, nodes_path: Path, out_path: Path) -> str:
    return f"""You are densifying edges for the **{domain_id}** domain.

1. Read the node listing at:
  {nodes_path}
   (One node per line: id | level | kind | year | breadcrumb | description.)

2. Propose additional edges between these nodes. The current edge set is \
sparse — aim to add many more relationships using the full set of edge \
kinds listed in the system prompt.

3. Write the output to:
  {out_path}

with this exact shape:
{{
  "domain_id": "{domain_id}",
  "edges": [
    {{ "from": "...", "to": "...", "kind": "...", "label": "...", \
"description": "..." }},
    ...
  ]
}}

Output ONLY a one-line confirmation summarising how many edges you added."""


# ---------------------------------------------------------------------------
# Phase 5 — DEDUPE
# ---------------------------------------------------------------------------

DEDUPE_SYSTEM_PROMPT = """You make merge decisions for a knowledge graph. \
You'll be given clusters of nodes that share normalized labels. For each \
cluster, decide whether the nodes are the SAME entity (merge them) or \
DIFFERENT entities that just happen to share a label (keep separate).

Use kind, year, breadcrumb, and description to decide.

## File-writing rules (NON-NEGOTIABLE)
- Use the **Write** tool to create the output file. It does not exist \
beforehand.
- If Write fails, retry Write **once**, then stop. NEVER use Bash heredocs.

Output ONLY valid JSON to the path you're given. No prose, no markdown \
fences."""


def dedupe_user_prompt(clusters_path: Path, out_path: Path) -> str:
    return f"""1. Read the candidate clusters at:
  {clusters_path}
   (It's a JSON array; each element is a cluster of nodes with similar \
labels. Each node has id, label, kind, year, description, breadcrumb.)

2. For each cluster, decide:
   - If they're the SAME entity (e.g. "Martin Luther King Jr." appearing \
under two different parents): pick the canonical id (prefer the one with \
the longer description or the more specific breadcrumb). The other(s) \
are duplicates.
   - If they're DIFFERENT entities that share a label (e.g. two different \
"Civil Rights Act"s — 1964 vs 1991): keep them separate.

3. Write your decisions to:
  {out_path}

with this shape:
{{
  "merges": [
    {{ "canonical": "node_id", "duplicates": ["node_id2", "node_id3"], \
"why": "brief reason" }},
    ...
  ],
  "keep_separate": [
    {{ "ids": ["id1", "id2"], "why": "brief reason" }},
    ...
  ]
}}

Output ONLY a one-line confirmation."""


__all__ = [
    "PLAN_SYSTEM_PROMPT", "plan_user_prompt",
    "EXTRACT_SYSTEM_PROMPT", "extract_user_prompt",
    "REVIEW_SYSTEM_PROMPT", "review_user_prompt",
    "DEDUPE_SYSTEM_PROMPT", "dedupe_user_prompt",
]
