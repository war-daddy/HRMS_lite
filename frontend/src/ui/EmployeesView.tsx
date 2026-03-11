import React from "react";
import { api, type Employee } from "../lib/api";

export function EmployeesView(props: {
  employees: Employee[] | null;
  loading: boolean;
  error: string | null;
  onReload: () => void;
  onEmployeesChanged: () => Promise<void> | void;
}) {
  const { employees, loading, error, onReload, onEmployeesChanged } = props;

  const [form, setForm] = React.useState({
    employee_id: "",
    full_name: "",
    email: "",
    department: ""
  });
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      await api.createEmployee({
        employee_id: form.employee_id.trim(),
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        department: form.department.trim()
      });
      setForm({ employee_id: "", full_name: "", email: "", department: "" });
      await onEmployeesChanged();
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to create employee.");
    } finally {
      setSubmitting(false);
    }
  }

  async function del(employee_id: string) {
    setDeleteError(null);
    setDeletingId(employee_id);
    try {
      await api.deleteEmployee(employee_id);
      await onEmployeesChanged();
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete employee.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid">
      <div className="card">
        <div className="cardHeader">
          <div>
            <h2>Add employee</h2>
            <p>Create a new employee record. Employee ID and email must be unique.</p>
          </div>
        </div>

        {submitError ? <div className="notice error">{submitError}</div> : null}

        <form onSubmit={submit}>
          <div className="row">
            <div className="field">
              <label>Employee ID</label>
              <input
                value={form.employee_id}
                onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
                placeholder="E.g. EMP-001"
                required
              />
            </div>
            <div className="field">
              <label>Full name</label>
              <input
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="E.g. Asha Verma"
                required
              />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="name@company.com"
                required
              />
            </div>
            <div className="field">
              <label>Department</label>
              <input
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                placeholder="E.g. Engineering"
                required
              />
            </div>
          </div>
          <div className="actions">
            <button className="btn btnPrimary" disabled={submitting} type="submit">
              {submitting ? "Saving..." : "Add employee"}
            </button>
            <button className="btn" type="button" onClick={onReload} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh list"}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <h2>Employees</h2>
            <p>All employee records in the system.</p>
          </div>
        </div>

        {error ? (
          <div className="notice error">
            {error}{" "}
            <button className="btn" onClick={onReload} disabled={loading}>
              Retry
            </button>
          </div>
        ) : null}

        {deleteError ? <div className="notice error">{deleteError}</div> : null}

        {loading && !employees ? <div className="notice">Loading employees…</div> : null}

        {!loading && employees && employees.length === 0 ? (
          <div className="notice">
            No employees yet. Add one on the left to get started.
          </div>
        ) : null}

        {employees && employees.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Full name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.employee_id}>
                    <td>{e.employee_id}</td>
                    <td>{e.full_name}</td>
                    <td>{e.email}</td>
                    <td>{e.department}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btnDanger"
                        onClick={() => del(e.employee_id)}
                        disabled={deletingId === e.employee_id}
                        title="Delete employee"
                      >
                        {deletingId === e.employee_id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

