from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.core.deps import get_db, get_current_user, check_role
from app.models.expense import Expense
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseOut, ExpenseStatusUpdate

router = APIRouter()

@router.get("/", response_model=list[ExpenseOut])
def list_expenses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    List all expenses. Visible to all authenticated users.
    """
    return db.scalars(select(Expense)).all()

@router.post("/", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    schema: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Employee"]))
):
    """
    Submit a new expense claim. (Employees and Admins only)
    """
    expense = Expense(
        title=schema.title,
        category=schema.category,
        amount=schema.amount,
        submitted_by_id=current_user.id
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense

@router.put("/{expense_id}/status", response_model=ExpenseOut)
def update_expense_status(
    expense_id: int,
    schema: ExpenseStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Manager"]))
):
    """
    Approve or Reject an expense submission. (Managers and Admins only)
    """
    if schema.status not in ["Pending", "Approved", "Rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status specified.")
        
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found.")
        
    expense.status = schema.status
    db.commit()
    db.refresh(expense)
    return expense
