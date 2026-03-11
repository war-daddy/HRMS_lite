from datetime import date
from enum import Enum

from pydantic import BaseModel, EmailStr, Field


class AttendanceStatus(str, Enum):
    PRESENT = "Present"
    ABSENT = "Absent"


class EmployeeCreate(BaseModel):
    employee_id: str = Field(min_length=1, max_length=50)
    full_name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    department: str = Field(min_length=1, max_length=120)


class EmployeeOut(BaseModel):
    employee_id: str
    full_name: str
    email: EmailStr
    department: str

    class Config:
        from_attributes = True


class AttendanceCreate(BaseModel):
    employee_id: str = Field(min_length=1, max_length=50)
    date: date
    status: AttendanceStatus


class AttendanceOut(BaseModel):
    date: date
    status: AttendanceStatus

    class Config:
        from_attributes = True


class AttendanceSummaryOut(BaseModel):
    employee_id: str
    total_days: int
    present_days: int
    absent_days: int

