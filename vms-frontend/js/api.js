// ===================================================================
// API client for the Django Vehicle Management System backend
// ===================================================================

export const API_BASE = window.VMS_API_BASE || 'http://127.0.0.1:8000';

const ACCESS_KEY = 'vms_access_token';
const REFRESH_KEY = 'vms_refresh_token';
const ROLE_KEY = 'vms_role';
const USERNAME_KEY = 'vms_username';

export const auth = {
  getAccess() { return localStorage.getItem(ACCESS_KEY); },
  getRefresh() { return localStorage.getItem(REFRESH_KEY); },
  getRole() { return localStorage.getItem(ROLE_KEY) || 'driver'; },
  getUsername() { return localStorage.getItem(USERNAME_KEY) || ''; },
  isAdmin() { return auth.getRole() === 'admin'; },
  isLoggedIn() { return !!auth.getAccess(); },
  setSession({ access, refresh, role, username }) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    if (role) localStorage.setItem(ROLE_KEY, role);
    if (username) localStorage.setItem(USERNAME_KEY, username);
  },
  setAccess(access) { localStorage.setItem(ACCESS_KEY, access); },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USERNAME_KEY);
  },
};

class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// Turns DRF-style error bodies ({field: ["msg"]} or {detail: "msg"}) into one string
export function formatApiError(body, fallback) {
  if (!body) return fallback;
  if (typeof body === 'string') return body;
  if (body.detail) return body.detail;
  const parts = [];
  for (const [field, val] of Object.entries(body)) {
    const msg = Array.isArray(val) ? val.join(' ') : String(val);
    parts.push(field === 'non_field_errors' ? msg : `${field}: ${msg}`);
  }
  return parts.length ? parts.join(' | ') : fallback;
}

async function doFetch(path, options) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const access = auth.getAccess();
  if (access && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${access}`;
  }
  const res = await fetch(url, { ...options, headers });
  return res;
}

async function refreshAccessToken() {
  const refresh = auth.getRefresh();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.access) return false;
    auth.setAccess(data.access);
    return true;
  } catch (e) {
    return false;
  }
}

// Main request helper. Automatically retries once after refreshing the
// access token if the first attempt comes back 401.
export async function apiRequest(path, { method = 'GET', body, skipAuth = false } = {}) {
  let res = await doFetch(path, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    skipAuth,
  });

  if (res.status === 401 && !skipAuth && auth.getRefresh()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await doFetch(path, {
        method,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        skipAuth,
      });
    }
  }

  let payload = null;
  const text = await res.text();
  if (text) {
    try { payload = JSON.parse(text); } catch (e) { payload = text; }
  }

  if (!res.ok) {
    if (res.status === 401) {
      auth.clear();
    }
    throw new ApiError(formatApiError(payload, `Request failed (${res.status})`), res.status, payload);
  }

  return payload;
}

export const api = {
  login(username, password) {
    return apiRequest('/api/auth/login/', { method: 'POST', body: { username, password }, skipAuth: true });
  },

  // Vehicles
  listVehicles(params = '') { return apiRequest(`/api/vehicles/${params}`); },
  getVehicle(id) { return apiRequest(`/api/vehicles/${id}/`); },
  createVehicle(data) { return apiRequest('/api/vehicles/', { method: 'POST', body: data }); },
  updateVehicle(id, data) { return apiRequest(`/api/vehicles/${id}/`, { method: 'PUT', body: data }); },
  patchVehicle(id, data) { return apiRequest(`/api/vehicles/${id}/`, { method: 'PATCH', body: data }); },
  deleteVehicle(id) { return apiRequest(`/api/vehicles/${id}/`, { method: 'DELETE' }); },

  // Drivers
  listDrivers(params = '') { return apiRequest(`/api/drivers/${params}`); },
  getDriver(id) { return apiRequest(`/api/drivers/${id}/`); },
  createDriver(data) { return apiRequest('/api/drivers/', { method: 'POST', body: data }); },
  updateDriver(id, data) { return apiRequest(`/api/drivers/${id}/`, { method: 'PUT', body: data }); },
  patchDriver(id, data) { return apiRequest(`/api/drivers/${id}/`, { method: 'PATCH', body: data }); },
  deleteDriver(id) { return apiRequest(`/api/drivers/${id}/`, { method: 'DELETE' }); },

  // Assignments
  listAssignments(params = '') { return apiRequest(`/api/assignments/${params}`); },
  getAssignment(id) { return apiRequest(`/api/assignments/${id}/`); },
  createAssignment(data) { return apiRequest('/api/assignments/', { method: 'POST', body: data }); },
  patchAssignment(id, data) { return apiRequest(`/api/assignments/${id}/`, { method: 'PATCH', body: data }); },
  deleteAssignment(id) { return apiRequest(`/api/assignments/${id}/`, { method: 'DELETE' }); },

  // Dashboard
  dashboard() { return apiRequest('/api/dashboard/'); },
};
