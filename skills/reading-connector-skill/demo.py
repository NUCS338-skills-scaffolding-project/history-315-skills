# demo.py — Example usage of the skill
import sys
sys.path.append("../skills/example-skill")
from logic import run

result = run({"key": "value"})
print(result)
