#!/usr/bin/env python3
"""
validate_skills.py — per-team skill metadata validator

Runs in each team's repo on every push/PR that touches skills/**/skills.md.
Provides fast feedback to authors before their skill flows into the central
catalog build.

Behaviour during migration (current setting):
  - ERRORS (block the push): truly broken skills only.
      * unparseable frontmatter
      * missing core fields (skill_id, name, skill_type, tags)
      * invalid skill_type (not "instructional" or "code")
      * invalid stance value when one is provided
      * invalid course_types value when provided
      * code skill missing logic.py at python_entry path

  - WARNINGS (don't block, but printed): everything new in the v0.1 contract
    that existing skills haven't migrated to yet.
      * stance missing (instructional)
      * course_types missing
      * learning_goal_tags missing
      * skill_id > 18 chars
      * name ends with " Skill"
      * empty/extra logic.py for instructional (cleanup nudge)

After all teams have migrated, the migration warnings can be promoted to
errors by flipping STRICT_MODE = True. See Mentora-Orchestrator-Catalog-
Contract-v0.1.md §11 (rollout plan) for the migration sequence.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

import yaml


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

STRICT_MODE = False  # flip to True once teams have migrated

VALID_SKILL_TYPES = {"instructional", "code"}
VALID_STANCES = {"socratic", "hint", "reframe", "meta"}
VALID_COURSE_TYPES = {"cs", "humanities"}
SKILL_ID_MAX_LEN = 18

CORE_REQUIRED_FIELDS = ["skill_id", "name", "skill_type", "tags"]


# ---------------------------------------------------------------------------
# Inline frontmatter parser (no python-frontmatter dependency)
# ---------------------------------------------------------------------------

_FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n?(.*)\Z", re.DOTALL)

def parse_frontmatter(text: str):
    """Return (metadata_dict, body_str) or raise ValueError if frontmatter is malformed."""
    m = _FRONTMATTER_RE.match(text)
    if not m:
        raise ValueError("no YAML frontmatter found at top of file (expected `---` markers)")
    try:
        meta = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError as e:
        raise ValueError(f"YAML frontmatter parse error: {e}")
    if not isinstance(meta, dict):
        raise ValueError("frontmatter is not a YAML mapping")
    return meta, m.group(2)


# ---------------------------------------------------------------------------
# Validation for a single skill
# ---------------------------------------------------------------------------

def validate_one(filepath: str):
    """Returns (errors, warnings) — both lists of strings tied to filepath."""
    errors, warnings = [], []
    skill_dir = os.path.dirname(filepath)

    try:
        text = Path(filepath).read_text(encoding="utf-8")
    except Exception as e:
        errors.append(f"{filepath}: cannot read file ({e})")
        return errors, warnings

    try:
        meta, _body = parse_frontmatter(text)
    except ValueError as e:
        errors.append(f"{filepath}: {e}")
        return errors, warnings

    # --- Core required fields (always errors) ---
    for field in CORE_REQUIRED_FIELDS:
        if not meta.get(field):
            errors.append(f"{filepath}: missing required field `{field}`")

    skill_type = meta.get("skill_type")
    if skill_type and skill_type not in VALID_SKILL_TYPES:
        errors.append(f"{filepath}: invalid skill_type `{skill_type}` "
                      f"(must be one of {sorted(VALID_SKILL_TYPES)})")

    # --- Validate values when fields ARE provided (always errors) ---
    stance = meta.get("stance")
    if stance is not None and stance not in VALID_STANCES:
        errors.append(f"{filepath}: invalid stance `{stance}` "
                      f"(must be one of {sorted(VALID_STANCES)})")

    course_types = meta.get("course_types")
    if course_types is not None:
        if not isinstance(course_types, list) or not course_types:
            errors.append(f"{filepath}: course_types must be a non-empty list")
        else:
            bad = [ct for ct in course_types if ct not in VALID_COURSE_TYPES]
            if bad:
                errors.append(f"{filepath}: course_types invalid values {bad} "
                              f"(allowed: {sorted(VALID_COURSE_TYPES)})")

    # --- Code-skill: logic.py must exist (always error) ---
    if skill_type == "code":
        py_entry = meta.get("python_entry") or "logic.py"
        py_path = os.path.join(skill_dir, py_entry)
        if not os.path.exists(py_path):
            errors.append(f"{filepath}: code skill must include `{py_entry}` "
                          f"(expected at {py_path})")

    # --- Migration warnings (don't block push during migration) ---
    migration_issues = []

    if skill_type == "instructional" and not stance:
        migration_issues.append("missing `stance` (one of: socratic, hint, reframe, meta) "
                                "— see Team-Guide §5")
    if not course_types:
        migration_issues.append("missing `course_types` (subset of [cs, humanities]) — see Team-Guide §4b")
    if not meta.get("learning_goal_tags"):
        migration_issues.append("missing `learning_goal_tags` — see Team-Guide §6 + "
                                "skills-registry/vocab/learning_goals.yaml")

    # naming conventions
    sid = meta.get("skill_id") or ""
    if len(sid) > SKILL_ID_MAX_LEN:
        migration_issues.append(f"skill_id `{sid}` is {len(sid)} chars "
                                f"(convention: ≤ {SKILL_ID_MAX_LEN}) — see Team-Guide §7")
    nm = (meta.get("name") or "").strip()
    if nm.lower().endswith(" skill"):
        migration_issues.append("`name` ends with 'Skill' — drop the suffix per Team-Guide §7")

    # instructional with empty/stub logic.py — cleanup nudge
    if skill_type == "instructional":
        py_entry = meta.get("python_entry")
        if py_entry:
            py_path = os.path.join(skill_dir, py_entry)
            if os.path.exists(py_path):
                size = os.path.getsize(py_path)
                if size < 200:  # likely a stub
                    migration_issues.append(
                        f"instructional skill ships `{py_entry}` ({size} bytes — looks like a stub). "
                        "If this skill has no executable logic, delete the file and remove "
                        "`python_entry:` from the YAML header. See Team-Guide §4c."
                    )

    if STRICT_MODE:
        errors.extend(f"{filepath}: {m}" for m in migration_issues)
    else:
        warnings.extend(f"{filepath}: {m}" for m in migration_issues)

    return errors, warnings


# ---------------------------------------------------------------------------
# Walk the skills/ directory
# ---------------------------------------------------------------------------

def validate_all_skills(root_dir="skills"):
    all_errors, all_warnings = [], []
    skill_md_files = []

    for root, _dirs, files in os.walk(root_dir):
        if "skills.md" in files:
            skill_md_files.append(os.path.join(root, "skills.md"))

    if not skill_md_files:
        print("No skills.md files found — nothing to validate.")
        return 0

    print(f"Validating {len(skill_md_files)} skill(s)...\n")

    for fp in skill_md_files:
        errs, warns = validate_one(fp)
        all_errors.extend(errs)
        all_warnings.extend(warns)

    # --- Report ---
    if all_warnings:
        print("WARNINGS (won't block your push — clean up at your leisure):")
        print("-" * 64)
        for w in all_warnings:
            print(f"  ⚠  {w}")
        print()

    if all_errors:
        print("ERRORS (must fix before pushing):")
        print("-" * 64)
        for e in all_errors:
            print(f"  ✖  {e}")
        print()
        print("Tips:")
        print("  - skill_id, name, skill_type, tags are required for every skill")
        print("  - skill_type must be exactly 'instructional' or 'code'")
        print("  - code skills must include a logic.py")
        print("  - See the Team-Guide.md for the full schema")
        return 1

    print(f"All {len(skill_md_files)} skill(s) passed required checks.")
    if all_warnings:
        print("(Some migration warnings above — please address when you can.)")
    return 0


if __name__ == "__main__":
    sys.exit(validate_all_skills())
