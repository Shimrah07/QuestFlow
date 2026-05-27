import os
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Load environment variables from the parent directory .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

class Settings(BaseModel):
    """
    Application configurations validated using Pydantic v2.
    Loads configurations from .env with fallback defaults.
    """
    PROJECT_NAME: str = Field(default=os.getenv("PROJECT_NAME", "Gamified Task & Expense Management System"))
    API_V1_STR: str = Field(default=os.getenv("API_V1_STR", "/api/v1"))
    ENVIRONMENT: str = Field(default=os.getenv("ENVIRONMENT", "development"))

    # Database Configuration (MS SQL Server)
    DATABASE_URL: str = Field(
        default=os.getenv(
            "DATABASE_URL",
            "mssql+pyodbc://sa:YourStrongPassword123@localhost:1433/task_expense_db?driver=ODBC+Driver+17+for+SQL+Server"
        )
    )

    # JWT Tokens Configuration
    JWT_SECRET_KEY: str = Field(default=os.getenv("JWT_SECRET_KEY", "supersecureaccesskey123!"))
    JWT_REFRESH_SECRET_KEY: str = Field(default=os.getenv("JWT_REFRESH_SECRET_KEY", "supersecurerefreshkey123!"))
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15")))
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")))

    # Security Algorithm Configurations
    ALGORITHM: str = "HS256"
    HASH_CONTEXT_SCHEMES: list[str] = ["bcrypt"]

settings = Settings()
