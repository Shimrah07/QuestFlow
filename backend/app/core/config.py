import os
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables from the parent directory .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

def _get_required_env(var_name: str) -> str:
    val = os.getenv(var_name)
    if not val:
        raise ValueError(f"CRITICAL SECURITY CONFIGURATION ERROR: Environment variable '{var_name}' is missing. Hardcoded secrets are prohibited.")
    return val

class Settings(BaseModel):
    """
    Application configurations validated using Pydantic v2.
    Requires environment variables for security keys.
    """
    PROJECT_NAME: str = Field(default=os.getenv("PROJECT_NAME", "QuestFlow"))
    API_V1_STR: str = Field(default=os.getenv("API_V1_STR", "/api/v1"))
    ENVIRONMENT: str = Field(default=os.getenv("ENVIRONMENT", "development"))

    # Database Configuration (MS SQL Server)
    DATABASE_URL: str = Field(
        default=os.getenv(
            "DATABASE_URL",
            "mssql+pyodbc://localhost/TaskExpenseDB?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes"
        )
    )

    # JWT Tokens Configuration - Require explicit environment variables
    JWT_SECRET_KEY: str = Field(default_factory=lambda: _get_required_env("JWT_SECRET_KEY"))
    JWT_REFRESH_SECRET_KEY: str = Field(default_factory=lambda: _get_required_env("JWT_REFRESH_SECRET_KEY"))
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15")))
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")))

    # CORS Allowed Origins
    ALLOWED_ORIGINS: list[str] = Field(
        default_factory=lambda: [
            origin.strip() for origin in os.getenv(
                "ALLOWED_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175,http://localhost:3000,http://127.0.0.1:3000"
            ).split(",") if origin.strip()
        ]
    )

    # Security Algorithm Configurations
    ALGORITHM: str = "HS256"
    HASH_CONTEXT_SCHEMES: list[str] = ["bcrypt"]

settings = Settings()
