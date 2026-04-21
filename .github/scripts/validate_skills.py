# validate_skills.py
# Checks all skills.md files for required YAML metadata fields
# If any fields are missing, the GitHub Action will fail and block the push

import os
import sys
import frontmatter

# Required in ALL skills regardless of type
BASE_REQUIRED_FIELDS = ["skill_id", "name", "skill_type", "tags", "python_entry"]

# Valid skill types
VALID_SKILL_TYPES = ["instructional", "code"]


def validate_all_skills(root_dir="skills"):
    errors = []
    warnings = []
    found = False

    for root, dirs, files in os.walk(root_dir):
        if "skills.md" in files:
            found = True
            filepath = os.path.join(root, "skills.md")
            skill_dir = os.path.dirname(filepath)

            with open(filepath) as f:
                post = frontmatter.load(f)

            metadata = post.metadata

            # ----------------------------------------
            # Check 1: Base required fields
            # ----------------------------------------
            for field in BASE_REQUIRED_FIELDS:
                if field not in metadata:
                    errors.append(
                        f"ERROR: MISSING '{field}' in {filepath}"
                    )

            # ----------------------------------------
            # Check 2: skill_type must be valid
            # ----------------------------------------
            skill_type = metadata.get("skill_type")

            if skill_type and skill_type not in VALID_SKILL_TYPES:
                errors.append(
                    f"ERROR: INVALID skill_type '{skill_type}' in {filepath}\n"
                    f"   Must be one of: {VALID_SKILL_TYPES}"
                )

            # ----------------------------------------
            # Check 3: ALL skills must have logic.py
            # ----------------------------------------
            logic_file = metadata.get("python_entry", "logic.py")
            logic_path = os.path.join(skill_dir, logic_file)

            if not os.path.exists(logic_path):
                errors.append(
                    f"ERROR: MISSING '{logic_file}' in {skill_dir}\n"
                    f"   All skills must include a logic.py file\n"
                    f"   Instructional skills can use it for text analysis,\n"
                    f"   response scoring, prompt generation, or tracking."
                )

    # ----------------------------------------
    # Results
    # ----------------------------------------
    if not found:
        print("WARNING: No skills.md files found — skipping validation.")
        sys.exit(0)

    if warnings:
        print("\n Warnings (won't block your push but worth checking):\n")
        for w in warnings:
            print(w)

    if errors:
        print("\nERROR:Validation Failed! Fix these issues before pushing:\n")
        for e in errors:
            print(e)
        print("\TIP: Every skills.md must include:")
        print("   skill_id, name, skill_type, tags")
        print("\nTIP: ALL skills must include:")
        print("   skill_id, name, skill_type, tags, python_entry + a logic.py file")
        print("\nTIP: Valid skill types are: instructional, code")
        print("\nTIP: Instructional logic.py uses: text analysis, response scoring,")
        print("   prompt generation, keyword detection, or progress tracking.")
        sys.exit(1)
    else:
        print(f"SUCCESS: All skills.md files passed validation!")
        sys.exit(0)

if __name__ == "__main__":
    validate_all_skills()