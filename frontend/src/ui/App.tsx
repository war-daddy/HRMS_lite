import React from "react";
import { api, type AttendanceRecord, type AttendanceStatus, type Employee } from "../lib/api";
import { Modal } from "./Modal";
import { IconCalendar, IconGrid, IconPlus, IconUsers } from "./icons";

type Page = "dashboard" | "employees" | "attendance";

function formatHumanDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map((x) => Number(x));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export function App() {
  const [page, setPage] = React.useState<Page>("dashboard");
  const [employees, setEmployees] = React.useState<Employee[] | null>(null);
  const [employeesError, setEmployeesError] = React.useState<string | null>(null);
  const [loadingEmployees, setLoadingEmployees] = React.useState(false);

  const reloadEmployees = React.useCallback(async () => {
    setLoadingEmployees(true);
    setEmployeesError(null);
    try {
      const data = await api.listEmployees();
      setEmployees(data);
    } catch (e: any) {
      setEmployees(null);
      setEmployeesError(e?.message || "Failed to load employees.");
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  React.useEffect(() => {
    void reloadEmployees();
  }, [reloadEmployees]);

  const [addOpen, setAddOpen] = React.useState(false);
  const [markOpen, setMarkOpen] = React.useState(false);

  const [addForm, setAddForm] = React.useState({
    employee_id: "",
    full_name: "",
    email: "",
    department: "Marketing",
    departmentOther: ""
  });
  const [adding, setAdding] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);

  const [markForm, setMarkForm] = React.useState<{
    employee_id: string;
    date: string;
    status: AttendanceStatus;
  }>({
    employee_id: "",
    date: new Date().toISOString().slice(0, 10),
    status: "Present"
  });
  const [marking, setMarking] = React.useState(false);
  const [markError, setMarkError] = React.useState<string | null>(null);

  const [dashboard, setDashboard] = React.useState<{
    totalEmployees: number;
    departments: number;
    totalPresent: number;
    totalAbsent: number;
    perEmployee: Array<{ employee_id: string; full_name: string; present: number; absent: number; total: number }>;
  } | null>(null);
  const [loadingDashboard, setLoadingDashboard] = React.useState(false);
  const [dashboardError, setDashboardError] = React.useState<string | null>(null);

  const [attendanceRows, setAttendanceRows] = React.useState<
    Array<{ employee_id: string; full_name: string; date: string; status: AttendanceStatus }>
  >([]);
  const [attendanceFilter, setAttendanceFilter] = React.useState<{ employee_id: string; date: string }>({
    employee_id: "",
    date: ""
  });
  const [loadingAttendance, setLoadingAttendance] = React.useState(false);
  const [attendanceError, setAttendanceError] = React.useState<string | null>(null);

  const loadDashboard = React.useCallback(async () => {
    if (!employees) return;
    setLoadingDashboard(true);
    setDashboardError(null);
    try {
      const deps = new Set(employees.map((e) => e.department.trim()).filter(Boolean));
      const results = await Promise.all(
        employees.map(async (e) => {
          const s = await api.attendanceSummary(e.employee_id);
          return { employee_id: e.employee_id, full_name: e.full_name, present: s.present_days, absent: s.absent_days, total: s.total_days };
        })
      );
      const totalPresent = results.reduce((acc, r) => acc + r.present, 0);
      const totalAbsent = results.reduce((acc, r) => acc + r.absent, 0);
      setDashboard({
        totalEmployees: employees.length,
        departments: deps.size,
        totalPresent,
        totalAbsent,
        perEmployee: results
      });
    } catch (e: any) {
      setDashboard(null);
      setDashboardError(e?.message || "Failed to load dashboard.");
    } finally {
      setLoadingDashboard(false);
    }
  }, [employees]);

  const loadAttendanceTable = React.useCallback(async () => {
    if (!employees) return;
    setLoadingAttendance(true);
    setAttendanceError(null);
    try {
      const selected = attendanceFilter.employee_id
        ? employees.filter((e) => e.employee_id === attendanceFilter.employee_id)
        : employees;
      const lists = await Promise.all(
        selected.map(async (e) => {
          const recs = await api.listAttendance(e.employee_id);
          return recs.map((r) => ({ employee_id: e.employee_id, full_name: e.full_name, date: r.date, status: r.status }));
        })
      );
      let merged = lists.flat();
      if (attendanceFilter.date) merged = merged.filter((r) => r.date === attendanceFilter.date);
      merged.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.employee_id.localeCompare(b.employee_id)));
      setAttendanceRows(merged);
    } catch (e: any) {
      setAttendanceRows([]);
      setAttendanceError(e?.message || "Failed to load attendance.");
    } finally {
      setLoadingAttendance(false);
    }
  }, [employees, attendanceFilter.date, attendanceFilter.employee_id]);

  React.useEffect(() => {
    if (page === "dashboard") void loadDashboard();
    if (page === "attendance") void loadAttendanceTable();
  }, [page, loadDashboard, loadAttendanceTable]);

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAdding(true);
    try {
      const department =
        addForm.department === "Other" ? addForm.departmentOther.trim() : addForm.department.trim();
      await api.createEmployee({
        employee_id: addForm.employee_id.trim(),
        full_name: addForm.full_name.trim(),
        email: addForm.email.trim(),
        department
      });
      setAddOpen(false);
      setAddForm({ employee_id: "", full_name: "", email: "", department: "Marketing", departmentOther: "" });
      await reloadEmployees();
      if (page === "dashboard") await loadDashboard();
    } catch (err: any) {
      setAddError(err?.message || "Failed to add employee.");
    } finally {
      setAdding(false);
    }
  }

  async function submitMark(e: React.FormEvent) {
    e.preventDefault();
    setMarkError(null);
    setMarking(true);
    try {
      await api.markAttendance(markForm);
      setMarkOpen(false);
      setMarkForm((f) => ({ ...f }));
      if (page === "attendance") await loadAttendanceTable();
      if (page === "dashboard") await loadDashboard();
    } catch (err: any) {
      setMarkError(err?.message || "Failed to mark attendance.");
    } finally {
      setMarking(false);
    }
  }

  async function deleteEmployee(employee_id: string) {
    try {
      await api.deleteEmployee(employee_id);
      await reloadEmployees();
      if (page === "dashboard") await loadDashboard();
      if (page === "attendance") await loadAttendanceTable();
    } catch (e: any) {
      alert(e?.message || "Failed to delete employee.");
    }
  }

  return (
    <>
      <div className="navbar">
        <div className="navbarInner">
          <div className="brand">
            <div className="logo" aria-hidden="true">
              H
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div>
                <h1 style={{ fontSize: 16, margin: 0, letterSpacing: "-0.2px" }}>HRMS Lite</h1>
              </div>
              <div className="navLinks" aria-label="Navigation">
                <button
                  className={`navItem ${page === "dashboard" ? "navItemActive" : ""}`}
                  onClick={() => setPage("dashboard")}
                >
                  <IconGrid />
                  Dashboard
                </button>
                <button
                  className={`navItem ${page === "employees" ? "navItemActive" : ""}`}
                  onClick={() => setPage("employees")}
                >
                  <IconUsers />
                  Employees
                </button>
                <button
                  className={`navItem ${page === "attendance" ? "navItemActive" : ""}`}
                  onClick={() => setPage("attendance")}
                >
                  <IconCalendar />
                  Attendance
                </button>
              </div>
            </div>
          </div>
          <div className="navRight">
            <span>admin</span>
          </div>
        </div>
      </div>

      <div className="container">
        {employeesError ? <div className="notice error">{employeesError}</div> : null}

        {page === "dashboard" ? (
          <>
            <div className="pageHeader">
              <div>
                <h2>Dashboard</h2>
                <p>Overview of your HR data</p>
              </div>
            </div>

            {loadingDashboard && !dashboard ? <div className="notice">Loading dashboard…</div> : null}
            {dashboardError ? <div className="notice error">{dashboardError}</div> : null}

            {dashboard ? (
              <>
                <div className="kpi4" style={{ marginBottom: 16 }}>
                  <div className="kpiItem">
                    <div className="label">Total Employees</div>
                    <div className="value">{dashboard.totalEmployees}</div>
                  </div>
                  <div className="kpiItem">
                    <div className="label">Departments</div>
                    <div className="value">{dashboard.departments}</div>
                  </div>
                  <div className="kpiItem">
                    <div className="label">Total Present Days</div>
                    <div className="value">{dashboard.totalPresent}</div>
                  </div>
                  <div className="kpiItem">
                    <div className="label">Total Absent Days</div>
                    <div className="value">{dashboard.totalAbsent}</div>
                  </div>
                </div>

                <div className="card">
                  <div className="cardHeader">
                    <div>
                      <h2>Attendance Summary per Employee</h2>
                      <p>Present/Absent totals for each employee.</p>
                    </div>
                  </div>

                  {employees && employees.length === 0 ? (
                    <div className="notice">No employees yet.</div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Present</th>
                            <th>Absent</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboard.perEmployee.map((r) => (
                            <tr key={r.employee_id}>
                              <td>{r.employee_id}</td>
                              <td style={{ fontWeight: 700 }}>{r.full_name}</td>
                              <td>{r.present}</td>
                              <td>{r.absent}</td>
                              <td>{r.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </>
        ) : null}

        {page === "employees" ? (
          <>
            <div className="pageHeader">
              <div>
                <h2>Employees</h2>
                <p>Manage your team members</p>
              </div>
              <button className="btn btnPrimary btnIcon" onClick={() => setAddOpen(true)}>
                <IconPlus />
                Add Employee
              </button>
            </div>

            {loadingEmployees && !employees ? <div className="notice">Loading employees…</div> : null}
            {!loadingEmployees && employees && employees.length === 0 ? (
              <div className="notice">No employees yet. Click “Add Employee” to create one.</div>
            ) : null}

            {employees && employees.length > 0 ? (
              <div className="card">
                <div style={{ overflowX: "auto" }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Employee ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Department</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((e) => (
                        <tr key={e.employee_id}>
                          <td>{e.employee_id}</td>
                          <td style={{ fontWeight: 700 }}>{e.full_name}</td>
                          <td>{e.email}</td>
                          <td>
                            <span className="pill">{e.department}</span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button className="btn" onClick={() => void deleteEmployee(e.employee_id)} title="Delete">
                              🗑
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {page === "attendance" ? (
          <>
            <div className="pageHeader">
              <div>
                <h2>Attendance</h2>
                <p>Track daily attendance records</p>
              </div>
              <button className="btn btnPrimary btnIcon" onClick={() => setMarkOpen(true)}>
                <IconCalendar />
                Mark Attendance
              </button>
            </div>

            <div className="row" style={{ marginBottom: 12 }}>
              <div className="field" style={{ minWidth: 260 }}>
                <label>Employee</label>
                <select
                  value={attendanceFilter.employee_id}
                  onChange={(e) => setAttendanceFilter((s) => ({ ...s, employee_id: e.target.value }))}
                  disabled={!employees || employees.length === 0}
                >
                  <option value="">All employees</option>
                  {(employees || []).map((e) => (
                    <option key={e.employee_id} value={e.employee_id}>
                      {e.employee_id} — {e.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ minWidth: 220 }}>
                <label>Date</label>
                <input
                  type="date"
                  value={attendanceFilter.date}
                  onChange={(e) => setAttendanceFilter((s) => ({ ...s, date: e.target.value }))}
                  disabled={!employees || employees.length === 0}
                />
              </div>
              <div className="actions" style={{ marginTop: 18 }}>
                <button className="btn" type="button" onClick={() => void loadAttendanceTable()} disabled={!employees || employees.length === 0}>
                  Apply
                </button>
                <button className="btn" type="button" onClick={() => setAttendanceFilter({ employee_id: "", date: "" })}>
                  Clear
                </button>
              </div>
            </div>

            {attendanceError ? <div className="notice error">{attendanceError}</div> : null}
            {loadingAttendance ? <div className="notice">Loading attendance…</div> : null}

            <div className="card">
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee ID</th>
                      <th>Name</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRows.length === 0 ? (
                      <tr>
                        <td colSpan={4}>
                          <div className="notice" style={{ margin: 0 }}>
                            No attendance records found.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      attendanceRows.map((r) => (
                        <tr key={`${r.employee_id}-${r.date}-${r.status}`}>
                          <td>{r.employee_id}</td>
                          <td style={{ fontWeight: 700 }}>{r.full_name}</td>
                          <td>{formatHumanDate(r.date)}</td>
                          <td>
                            <span className={`pill ${r.status === "Present" ? "pillPresent" : "pillAbsent"}`}>
                              {r.status === "Present" ? "Present" : "Absent"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}

        <Modal title="Add New Employee" open={addOpen} onClose={() => setAddOpen(false)}>
          {addError ? <div className="notice error">{addError}</div> : null}
          <form onSubmit={submitAdd}>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Employee ID</label>
              <input value={addForm.employee_id} onChange={(e) => setAddForm((f) => ({ ...f, employee_id: e.target.value }))} placeholder="EMP-001" required />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Full Name</label>
              <input value={addForm.full_name} onChange={(e) => setAddForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="John Doe" required />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Email</label>
              <input type="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} placeholder="john@company.com" required />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Department</label>
              <select
                value={addForm.department}
                onChange={(e) => setAddForm((f) => ({ ...f, department: e.target.value }))}
                required
              >
                {["Engineering", "HR", "Marketing", "Sales", "Finance", "Operations", "Other"].map((d) => (
                  <option key={d} value={d}>
                    {d === "Other" ? "Other (custom)" : d}
                  </option>
                ))}
              </select>
            </div>
            {addForm.department === "Other" ? (
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Custom department</label>
                <input
                  value={addForm.departmentOther}
                  onChange={(e) => setAddForm((f) => ({ ...f, departmentOther: e.target.value }))}
                  placeholder="e.g. Support"
                  required
                />
              </div>
            ) : null}
            <div className="actions">
              <button className="btn btnPrimary" type="submit" disabled={adding}>
                {adding ? "Adding..." : "Add Employee"}
              </button>
            </div>
          </form>
        </Modal>

        <Modal title="Mark Attendance" open={markOpen} onClose={() => setMarkOpen(false)}>
          {markError ? <div className="notice error">{markError}</div> : null}
          <form onSubmit={submitMark}>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Employee</label>
              <select
                value={markForm.employee_id}
                onChange={(e) => setMarkForm((f) => ({ ...f, employee_id: e.target.value }))}
                required
                disabled={!employees || employees.length === 0}
              >
                <option value="" disabled>
                  Select employee
                </option>
                {(employees || []).map((e) => (
                  <option key={e.employee_id} value={e.employee_id}>
                    {e.full_name} ({e.employee_id})
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Date</label>
              <input
                type="date"
                value={markForm.date}
                onChange={(e) => setMarkForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Status</label>
              <select
                value={markForm.status}
                onChange={(e) => setMarkForm((f) => ({ ...f, status: e.target.value as AttendanceStatus }))}
                required
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
            <div className="actions">
              <button className="btn btnPrimary" type="submit" disabled={marking}>
                {marking ? "Saving..." : "Mark Attendance"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
}

