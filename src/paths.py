"""
FacilityBrain — shared path resolver.
Every other script imports DATA_DIR / OUTPUTS_DIR from here instead of using
bare "data/..." or "outputs/..." strings, so the whole project runs correctly
no matter what directory you launch it from (this was the cause of the
FileNotFoundError when running from a different drive/folder on Windows).
"""
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # parent of src/
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
OUTPUTS_DIR = os.path.join(PROJECT_ROOT, "outputs")

os.makedirs(OUTPUTS_DIR, exist_ok=True)
