import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

AWS_REGION = os.getenv("AWS_REGION", "us-east-2")
DYNAMODB_USER_PROFILES_TABLE = os.getenv("DYNAMODB_USER_PROFILES_TABLE", "UserProfiles")
DYNAMODB_JOB_POSTS_TABLE = os.getenv("DYNAMODB_JOB_POSTS_TABLE", "JobPosts")
DYNAMODB_AGENT_RUNS_TABLE = os.getenv("DYNAMODB_AGENT_RUNS_TABLE", "AgentRuns")
BEDROCK_REGION = os.getenv("BEDROCK_REGION", AWS_REGION)
BEDROCK_MODEL_ID = os.getenv(
    "BEDROCK_MODEL_ID",
    "anthropic.claude-3-haiku-20240307-v1:0"
)
ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID", "")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY", "")
ADZUNA_COUNTRY = os.getenv("ADZUNA_COUNTRY", "us")
AUTH_MODE = os.getenv("AUTH_MODE", "local").lower()
COGNITO_REGION = os.getenv("COGNITO_REGION", AWS_REGION)
COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID", "")
COGNITO_APP_CLIENT_ID = os.getenv("COGNITO_APP_CLIENT_ID", "")
DEMO_AUTH_CONFIRM_ENABLED = os.getenv("DEMO_AUTH_CONFIRM_ENABLED", "false").lower() == "true"
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]
