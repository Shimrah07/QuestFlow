from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def home():
    return {"message": "Task Expense Management API"}