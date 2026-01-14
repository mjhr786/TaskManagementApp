
import { getAuth } from '../auth/auth'

const BASE = import.meta.env.VITE_API_BASE_URL || 'https://todotaskapp.azurewebsites.net/' // 'https://todotaskapp.azurewebsites.net/' // 'http://localhost:5169'



async function request(path: string, opts: RequestInit = {}) {
  const auth = getAuth()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(opts.headers || {})
  }
  if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`

  const res = await fetch(`${BASE}${path}`, { ...opts, headers })

  // Handle unauthorized
  if (res.status === 401) throw new Error('Unauthorized')

  // Handle non-OK (try to parse ProblemDetails if present)
  if (!res.ok) {
    let msg = res.statusText
    try {
      const problemText = await res.text()
      if (problemText) {
        const problem = JSON.parse(problemText)
        msg = problem?.title || problem?.detail || msg
      }
    } catch { /* ignore parse errors */ }
    throw new Error(msg)
  }

  // 204: No content
  if (res.status === 204) return null

  // ✅ Robust success parsing
  const text = await res.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    // If server returned non-JSON content, treat as no payload
    return null
  }
}



export type GetTasksParams = {
  page?: number
  pageSize?: number
  sort?: 'date' | 'title' | 'status'
  order?: 'asc' | 'desc'
  date?: string         // exact day (YYYY-MM-DD)
  status?: 'New'|'InProgress'|'Completed'|'Archived' | ''
  fromDate?: string     // YYYY-MM-DD
  toDate?: string       // YYYY-MM-DD
}

export const api = {
  login: (userName: string, password: string) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ userName, password }) }),

  register: (userName: string, email: string, password: string) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify({ userName, email, password }) }),

  // Users (Admin)
  getUsers: () => request('/api/users'),
  createUser: (userName: string, email: string) =>
    request('/api/users', { method: 'POST', body: JSON.stringify({ userName, email }) }),
  deleteUser: (id: string) => request(`/api/users/${id}`, { method: 'DELETE' }),

  // Tasks (server-side pagination & sorting)
  getTasks: (params: GetTasksParams = {}) => {
    const qs = new URLSearchParams()
    if (params.page) qs.set('page', String(params.page))
    if (params.pageSize) qs.set('pageSize', String(params.pageSize))
    if (params.sort) qs.set('sort', params.sort)
    if (params.order) qs.set('order', params.order)
    if (params.date) qs.set('date', params.date)
    if (params.status) qs.set('status', params.status)
    if (params.fromDate) qs.set('fromDate', params.fromDate)
    if (params.toDate) qs.set('toDate', params.toDate)
    const query = qs.toString() ? `?${qs}` : ''
    return request(`/api/tasks${query}`)
  },


  // createTask
  createTask: (payload: { title: string, description?: string, startDate: string, endDate: string }) =>
    request('/api/tasks', { method: 'POST', body: JSON.stringify(payload) }),

  // updateTask
  updateTask: (id: string, payload: { title: string, description?: string, startDate: string, endDate: string }) =>
    request(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),


  completeTask: (id: string) => request(`/api/tasks/${id}/complete`, { method: 'PATCH' }),

  updateTaskStatus: (id: string, status: 'New'|'InProgress'|'Completed'|'Archived') =>
    status === 'Completed'
      ? request(`/api/tasks/${id}/complete`, { method: 'PATCH' })
      : request(`/api/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  deleteTask: (id: string) => request(`/api/tasks/${id}`, { method: 'DELETE' }),

  logHours: (id: string, hours: number) =>
    request(`/api/tasks/${id}/logs`, { method: 'POST', body: JSON.stringify({ hours }) }),
}

export async function exportMyTasksExcel(params: {
  fromDate?: string; toDate?: string; status?: string;
}) {
  const qs = new URLSearchParams();
  if (params.fromDate) qs.set('fromDate', params.fromDate);
  if (params.toDate)   qs.set('toDate', params.toDate);
  if (params.status)   qs.set('status', params.status);

  const url = `${BASE}/api/tasks/export?${qs.toString()}`;
  const token = (localStorage.getItem('todo_token') ?? '');
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
  return await res.blob(); // Excel blob
}

export async function exportAllTasksExcel(params: {
  fromDate?: string; toDate?: string; status?: string;
}) {
  const qs = new URLSearchParams();
  if (params.fromDate) qs.set('fromDate', params.fromDate);
  if (params.toDate)   qs.set('toDate', params.toDate);
  if (params.status)   qs.set('status', params.status);

  const url = `${BASE}/api/tasks/export/all?${qs.toString()}`;
  const token = (localStorage.getItem('todo_token') ?? '');
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
  return await res.blob();
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


export async function importTasksExcel(file: File) {
  const form = new FormData();
  form.append('file', file);

  const token = localStorage.getItem('todo_token') ?? '';
  const res = await fetch(`${BASE}/api/tasks/import`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined as any,
    body: form
  });
  // console.log('Import response:', res.text());
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.log('Import error text:', text);
    throw new Error(text || res.statusText);
  }
  // if((await res.text()).search('errors')){
  //   console.log('Import encountered errors');
  // }
  // console.log('Import successful', res.json());
  return res.json(); // ImportResult { totalRows, imported, skipped, errors[] }
}


