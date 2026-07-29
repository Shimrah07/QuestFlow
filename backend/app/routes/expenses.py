from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from app.core.deps import get_db, get_current_user, check_role
from app.models.expense import Expense
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseOut, ExpenseStatusUpdate

router = APIRouter()

@router.get("/", response_model=list[ExpenseOut])
def list_expenses(
    search: Optional[str] = Query(None, description="Search expenses by title"),
    category_filter: Optional[str] = Query(None, alias="category", description="Filter by category"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (Pending, Approved, Rejected)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List expenses with strict server-side role filtering and search/filters:
    - Admin: view all expenses.
    - Manager: view own submitted expenses + claims awaiting review (Pending status).
    - Employee: view only own submitted expenses.
    """
    if current_user.role == "Admin":
        query = select(Expense)
    elif current_user.role == "Manager":
        query = select(Expense).where(
            or_(
                Expense.submitted_by_id == current_user.id,
                Expense.status == "Pending"
            )
        )
    else:
        query = select(Expense).where(Expense.submitted_by_id == current_user.id)

    if category_filter and category_filter != "All Categories":
        query = query.where(Expense.category == category_filter)
    if status_filter:
        query = query.where(Expense.status == status_filter)
    if search:
        search_term = f"%{search}%"
        query = query.where(Expense.title.ilike(search_term))

    return db.scalars(query).all()

@router.get("/{expense_id}", response_model=ExpenseOut)
def get_expense_detail(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information for a specific expense claim.
    """
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found.")

    # Authorization Check
    is_authorized = (
        current_user.role == "Admin"
        or (current_user.role == "Manager" and (expense.submitted_by_id == current_user.id or expense.status == "Pending"))
        or (current_user.role == "Employee" and expense.submitted_by_id == current_user.id)
    )
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Access Denied: You do not have permission to view this expense.")

    return expense

@router.post("/", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    schema: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Manager", "Employee"]))
):
    """
    Submit a new expense claim. (Employees, Managers, and Admins)
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

@router.put("/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: int,
    schema: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Edit an expense claim.
    Allowed for owner if status is Pending, or Admin.
    """
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found.")

    is_authorized = (
        current_user.role == "Admin"
        or (expense.submitted_by_id == current_user.id and expense.status == "Pending")
    )
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Expense claims can only be edited by their owner while Pending, or by an Admin."
        )

    if schema.title is not None:
        expense.title = schema.title
    if schema.category is not None:
        expense.category = schema.category
    if schema.amount is not None:
        expense.amount = schema.amount

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
    Cannot approve or reject own expense submission.
    """
    if schema.status not in ["Pending", "Approved", "Rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status specified.")
        
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found.")
        
    # Prevent self-approval vulnerability
    if expense.submitted_by_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Self-approval constraint: You cannot approve or reject your own expense claim."
        )

    expense.status = schema.status
    db.commit()
    db.refresh(expense)
    return expense

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an expense claim.
    Allowed for owner if status is Pending, or Admin.
    """
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found.")

    is_authorized = (
        current_user.role == "Admin"
        or (expense.submitted_by_id == current_user.id and expense.status == "Pending")
    )
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Expense claims can only be deleted by their owner while Pending, or by an Admin."
        )

    db.delete(expense)
    db.commit()
    return None
