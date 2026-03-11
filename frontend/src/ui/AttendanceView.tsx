import React from "react";
import { api, type AttendanceRecord, type AttendanceStatus, type Employee } from "../lib/api";

function formatISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function AttendanceView(props: {
  employees: Employee[] | null;
  loadingEmployees: boolean;
  employeesError: string | null;
  onReloadEmployees: () => void;
  defaultEmployeeId: string | null;
}) {
  const { employees, loadingEmployees, employeesError, onReloadEmployees, defaultEmployeeId } =
    props;

  const [employeeId, setEmployeeId] = React.useState<string>(defaultEmployeeId || "");
  const [date, setDate] = React.useState<string>(formatISODate(new Date()));
  const [status, setStatus] = React.useState<AttendanceStatus>("Present");

  const [range, setRange] = React.useState<{ from: string; to: string }>({
    from: "",
    to: ""
  });

  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saveOk, setSaveOk] = React.useState<string | null>(null);

  const [records, setRecords] = React.useState<AttendanceRecord[] | null>(null);
  const [summary, setSummary] = React.useState<{
    total_days: number;
    present_days: number;
    absent_days: number;
  } | null>(null);
  const [loadingRecords, setLoadingRecords] = React.useState(false);
  const [recordsError, setRecordsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (defaultEmployeeId && !employeeId) setEmployeeId(defaultEmployeeId);
  }, [defaultEmployeeId, employeeId]);

  const canWork = Boolean(employeeId);

  const loadRecords = React.useCallback(async () => {
    if (!employeeId) return;
    setLoadingRecords(true);
    setRecordsError(null);
    try {
      const params: { from?: string; to?: string } = {};
      if (range.from) params.from = range.from;
      if (range.to) params.to = range.to;
      const [r, s] = await Promise.all([
        api.listAttendance(employeeId, params),
        api.attendanceSummary(employeeId, params)
      ]);
      setRecords(r);
      setSummary({
        total_days: s.total_days,
        present_days: s.present_days,
        absent_days: s.absent_days
      });
    } catch (e: any) {
      setRecords(null);
      setSummary(null);
      setRecordsError(e?.message || "Failed to load attendance.");
    } finally {
      setLoadingRecords(false);
    }
  }, [employeeId, range.from, range.to]);

  React.useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaveOk(null);
    if (!employeeId) {
      setSaveError("Please select an employee.");
      return;
    }
    setSaving(true);
    try {
      await api.markAttendance({ employee_id: employeeId, date, status });
      setSaveOk("Attendance saved.");
      await loadRecords();
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid">
      <div className="card">
        <div className="cardHeader">
          <div>
            <h2>Mark attendance</h2>
            <p>Record daily presence status for an employee.</p>
          </div>
        </div>

        {employeesError ? (
          <div className="notice error">
            {employeesError}{" "}
            <button className="btn" onClick={onReloadEmployees} disabled={loadingEmployees}>
              Retry
            </button>
          </div>
        ) : null}

        {loadingEmployees && !employees ? <div className="notice">Loading employees…</div> : null}

        {!loadingEmployees && employees && employees.length === 0 ? (
          <div className="notice">Add at least one employee to start marking attendance.</div>
        ) : null}

        {saveError ? <div className="notice error">{saveError}</div> : null}
        {saveOk ? <div className="notice">{saveOk}</div> : null}

        <form onSubmit={save}>
          <div className="row">
            <div className="field" style={{ minWidth: 260 }}>
              <label>Employee</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={!employees || employees.length === 0}
                required
              >
                <option value="" disabled>
                  Select employee…
                </option>
                {(employees || []).map((e) => (
                  <option key={e.employee_id} value={e.employee_id}>
                    {e.full_name} ({e.employee_id})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)} required>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
          </div>
          <div className="actions">
            <button className="btn btnPrimary" type="submit" disabled={saving || !canWork}>
              {saving ? "Saving..." : "Save attendance"}
            </button>
            <button className="btn" type="button" onClick={loadRecords} disabled={!canWork}>
              Refresh records
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <h2>Attendance records</h2>
            <p>View records by employee, optionally filtered by date range.</p>
          </div>
        </div>

        <div className="row" style={{ marginBottom: 10 }}>
          <div className="field">
            <label>From</label>
            <input
              type="date"
              value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              disabled={!canWork}
            />
          </div>
          <div className="field">
            <label>To</label>
            <input
              type="date"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              disabled={!canWork}
            />
          </div>
          <div className="actions" style={{ marginTop: 18 }}>
            <button className="btn" type="button" onClick={loadRecords} disabled={!canWork}>
              Apply filter
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => setRange({ from: "", to: "" })}
              disabled={!canWork}
            >
              Clear
            </button>
          </div>
        </div>

        {recordsError ? <div className="notice error">{recordsError}</div> : null}
        {loadingRecords && !records ? <div className="notice">Loading attendance…</div> : null}

        {summary ? (
          <div className="kpi" style={{ marginBottom: 12 }}>
            <div className="kpiItem">
              <div className="label">Total marked</div>
              <div className="value">{summary.total_days}</div>
            </div>
            <div className="kpiItem">
              <div className="label">Present days</div>
              <div className="value">{summary.present_days}</div>
            </div>
            <div className="kpiItem">
              <div className="label">Absent days</div>
              <div className="value">{summary.absent_days}</div>
            </div>
          </div>
        ) : null}

        {!loadingRecords && canWork && records && records.length === 0 ? (
          <div className="notice">No records found for this employee (and filter).</div>
        ) : null}

        {!canWork && employees && employees.length > 0 ? (
          <div className="notice">Select an employee to view attendance records.</div>
        ) : null}

        {records && records.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={`${r.date}-${r.status}`}>
                    <td>{r.date}</td>
                    <td>
                      <span
                        className={`pill ${
                          r.status === "Present" ? "pillPresent" : "pillAbsent"
                        }`}
                      >
                        {r.status}
                      </span>
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

