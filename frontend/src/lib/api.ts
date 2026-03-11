export type Employee = {
  employee_id: string;
  full_name: string;
  email: string;
  department: string;
};

export type AttendanceStatus = "Present" | "Absent";

export type AttendanceRecord = {
  date: string; // ISO date
  status: AttendanceStatus;
};

export type AttendanceSummary = {
  employee_id: string;
  total_days: number;
  present_days: number;
  absent_days: number;
};

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000";

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) return "Validation error.";
  } catch {
    // ignore
  }
  return `${res.status} ${res.statusText}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  listEmployees: () => request<Employee[]>("/employees"),
  createEmployee: (payload: {
    employee_id: string;
    full_name: string;
    email: string;
    department: string;
  }) =>
    request<Employee>("/employees", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  deleteEmployee: (employee_id: string) =>
    request<void>(`/employees/${encodeURIComponent(employee_id)}`, { method: "DELETE" }),

  markAttendance: (payload: { employee_id: string; date: string; status: AttendanceStatus }) =>
    request<AttendanceRecord>("/attendance", { method: "POST", body: JSON.stringify(payload) }),

  listAttendance: (employee_id: string, params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<AttendanceRecord[]>(
      `/employees/${encodeURIComponent(employee_id)}/attendance${suffix}`
    );
  },

  attendanceSummary: (employee_id: string, params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<AttendanceSummary>(
      `/employees/${encodeURIComponent(employee_id)}/attendance/summary${suffix}`
    );
  }
};

