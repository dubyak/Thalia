import sys
from pathlib import Path

from dotenv import load_dotenv

# Load .env from backend dir so OPENAI_API_KEY is available
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Add backend dir to Python path so tests can import agent, state, etc.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
