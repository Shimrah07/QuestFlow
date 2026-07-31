from app.db.session import engine
from app.db.base import Base
# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.projects import router as projects_router
from app.routes.tasks import router as tasks_router
from app.routes.expenses import router as expenses_router
from app.routes.reports import router as reports_router
from app.core.config import settings

# Import models to ensure they are registered in the Declarative Base metadata
from app.models.user import User, RefreshToken
from app.models.project import Project
from app.models.task import Task
from app.models.expense import Expense

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0"
)

# Configure CORS to enforce origin restrictions while supporting dev environment
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(users_router, prefix=f"{settings.API_V1_STR}/users", tags=["Users Management"])
app.include_router(projects_router, prefix=f"{settings.API_V1_STR}/projects", tags=["Projects Management"])
app.include_router(tasks_router, prefix=f"{settings.API_V1_STR}/tasks", tags=["Task Operations"])
app.include_router(expenses_router, prefix=f"{settings.API_V1_STR}/expenses", tags=["Expense Tracking"])
app.include_router(reports_router, prefix=f"{settings.API_V1_STR}/reports", tags=["System Reports"])

@app.get("/")
def home():
    return {"message": "QuestFlow API"}

Base.metadata.create_all(bind=engine)