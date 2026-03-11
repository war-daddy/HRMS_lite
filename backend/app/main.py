from datetime import date
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import and_, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import Attendance, Employee
from .schemas import (
    AttendanceCreate,
    AttendanceOut,
    AttendanceStatus,
    AttendanceSummaryOut,
    EmployeeCreate,
    EmployeeOut,
)
from .settings import settings


app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/employees", response_model=EmployeeOut, status_code=201)
def create_employee(payload: EmployeeCreate, db: Session = Depends(get_db)):
    employee = Employee(
        employee_id=payload.employee_id.strip(),
        full_name=payload.full_name.strip(),
        email=str(payload.email).strip().lower(),
        department=payload.department.strip(),
    )
    db.add(employee)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Employee ID or email already exists.",
        )
    db.refresh(employee)
    return employee


@app.get("/employees", response_model=list[EmployeeOut])
def list_employees(db: Session = Depends(get_db)):
    employees = db.execute(select(Employee).order_by(Employee.full_name.asc())).scalars().all()
    return employees


@app.delete("/employees/{employee_id}", status_code=204)
def delete_employee(employee_id: str, db: Session = Depends(get_db)):
    employee = db.execute(
        select(Employee).where(Employee.employee_id == employee_id)
    ).scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")
    db.delete(employee)
    db.commit()
    return None


@app.post("/attendance", response_model=AttendanceOut, status_code=201)
def mark_attendance(payload: AttendanceCreate, db: Session = Depends(get_db)):
    employee = db.execute(
        select(Employee).where(Employee.employee_id == payload.employee_id)
    ).scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")

    record = Attendance(
        employee_id_fk=employee.id,
        date=payload.date,
        status=payload.status.value,
    )
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Attendance already marked for this employee on this date.",
        )
    db.refresh(record)
    return AttendanceOut(date=record.date, status=AttendanceStatus(record.status))


@app.get("/employees/{employee_id}/attendance", response_model=list[AttendanceOut])
def list_attendance(
    employee_id: str,
    from_date: Optional[date] = Query(default=None, alias="from"),
    to_date: Optional[date] = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
):
    employee = db.execute(
        select(Employee).where(Employee.employee_id == employee_id)
    ).scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")

    conditions = [Attendance.employee_id_fk == employee.id]
    if from_date:
        conditions.append(Attendance.date >= from_date)
    if to_date:
        conditions.append(Attendance.date <= to_date)

    records = (
        db.execute(
            select(Attendance)
            .where(and_(*conditions))
            .order_by(Attendance.date.desc())
        )
        .scalars()
        .all()
    )
    return [AttendanceOut(date=r.date, status=AttendanceStatus(r.status)) for r in records]


@app.get("/employees/{employee_id}/attendance/summary", response_model=AttendanceSummaryOut)
def attendance_summary(
    employee_id: str,
    from_date: Optional[date] = Query(default=None, alias="from"),
    to_date: Optional[date] = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
):
    employee = db.execute(
        select(Employee).where(Employee.employee_id == employee_id)
    ).scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")

    conditions = [Attendance.employee_id_fk == employee.id]
    if from_date:
        conditions.append(Attendance.date >= from_date)
    if to_date:
        conditions.append(Attendance.date <= to_date)

    total = db.execute(select(func.count()).select_from(Attendance).where(and_(*conditions))).scalar_one()
    present = db.execute(
        select(func.count())
        .select_from(Attendance)
        .where(and_(*conditions, Attendance.status == AttendanceStatus.PRESENT.value))
    ).scalar_one()
    absent = db.execute(
        select(func.count())
        .select_from(Attendance)
        .where(and_(*conditions, Attendance.status == AttendanceStatus.ABSENT.value))
    ).scalar_one()

    return AttendanceSummaryOut(
        employee_id=employee.employee_id,
        total_days=int(total or 0),
        present_days=int(present or 0),
        absent_days=int(absent or 0),
    )

