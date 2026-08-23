// ===================================================================
// API client for the Django Vehicle Management System backend
// ===================================================================

export const API_BASE =
  window.VMS_API_BASE || 'http://127.0.0.1:8000';

// -------------------------------------------------------------------
// LocalStorage keys
// -------------------------------------------------------------------

const ACCESS_KEY = 'vms_access_token';
const REFRESH_KEY = 'vms_refresh_token';
const ROLE_KEY = 'vms_role';
const USERNAME_KEY = 'vms_username';


// ===================================================================
// AUTH / SESSION
// ===================================================================

export const auth = {

  getAccess() {
    return localStorage.getItem(ACCESS_KEY);
  },

  getRefresh() {
    return localStorage.getItem(REFRESH_KEY);
  },

  getRole() {
    return localStorage.getItem(ROLE_KEY) || '';
  },

  getUsername() {
    return localStorage.getItem(USERNAME_KEY) || '';
  },

  isAdmin() {
    return auth.getRole().toLowerCase() === 'admin';
  },

  isLoggedIn() {
    return !!auth.getAccess() && !!auth.getRefresh();
  },

  setSession({ access, refresh, role, username }) {

    if (access) {
      localStorage.setItem(ACCESS_KEY, access);
    }

    if (refresh) {
      localStorage.setItem(REFRESH_KEY, refresh);
    }

    if (role) {
      localStorage.setItem(ROLE_KEY, role);
    }

    if (username) {
      localStorage.setItem(USERNAME_KEY, username);
    }
  },

  setAccess(access) {
    if (access) {
      localStorage.setItem(ACCESS_KEY, access);
    }
  },

  setRefresh(refresh) {
    if (refresh) {
      localStorage.setItem(REFRESH_KEY, refresh);
    }
  },

  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USERNAME_KEY);
  }
};


// ===================================================================
// API ERROR
// ===================================================================

class ApiError extends Error {

  constructor(message, status, body) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}


// ===================================================================
// FORMAT DJANGO REST FRAMEWORK ERRORS
// ===================================================================

export function formatApiError(body, fallback = 'Request failed') {

  if (!body) {
    return fallback;
  }

  // Example:
  // {"detail": "Authentication credentials were not provided."}

  if (body.detail) {
    return body.detail;
  }

  // Example:
  // {
  //   "phone": ["Phone number must contain 10 digits."],
  //   "user": ["This user already has a driver profile."]
  // }

  if (typeof body === 'object') {

    const messages = [];

    for (const [field, value] of Object.entries(body)) {

      if (Array.isArray(value)) {

        messages.push(
          `${field}: ${value.join(' ')}`
        );

      } else {

        messages.push(
          `${field}: ${String(value)}`
        );
      }
    }

    if (messages.length) {
      return messages.join(' | ');
    }
  }

  if (typeof body === 'string') {
    return body;
  }

  return fallback;
}


// ===================================================================
// AUTH HEADER
// ===================================================================

function getAuthHeader() {

  const access = auth.getAccess();

  if (!access) {
    return {};
  }

  return {
    Authorization: `Bearer ${access}`
  };
}


// ===================================================================
// BASIC FETCH
// ===================================================================

async function doFetch(path, options = {}) {

  const url = path.startsWith('http')
    ? path
    : `${API_BASE}${path}`;

  const headers = {
    Accept: 'application/json',
    ...(options.headers || {})
  };

  // JSON body
  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers['Content-Type'] = 'application/json';
  }

  // Add JWT access token
  if (!options.skipAuth) {

    Object.assign(
      headers,
      getAuthHeader()
    );
  }

  return fetch(url, {
    ...options,
    headers
  });
}


// ===================================================================
// REFRESH TOKEN
// ===================================================================
//
// Important:
// If multiple API requests receive 401 at the same time,
// only ONE refresh request will be sent to Django.
//

let refreshPromise = null;


async function refreshAccessToken() {

  const refresh = auth.getRefresh();

  if (!refresh) {
    return false;
  }

  // If refresh is already running,
  // wait for the existing refresh request.
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {

    try {

      const response = await fetch(
        `${API_BASE}/api/auth/token/refresh/`,
        {
          method: 'POST',

          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            refresh: refresh
          })
        }
      );

      // Refresh token expired/invalid
      if (!response.ok) {

        auth.clear();

        return false;
      }

      const data = await response.json();

      // Django must return a new access token
      if (!data.access) {

        auth.clear();

        return false;
      }

      // Save new access token
      auth.setAccess(data.access);

      // If SimpleJWT rotation is enabled,
      // Django may also return a new refresh token.
      if (data.refresh) {

        auth.setRefresh(data.refresh);
      }

      return true;

    } catch (error) {

      console.error(
        'Token refresh failed:',
        error
      );

      auth.clear();

      return false;

    } finally {

      refreshPromise = null;
    }

  })();

  return refreshPromise;
}


// ===================================================================
// MAIN API REQUEST FUNCTION
// ===================================================================

export async function apiRequest(
  path,
  {
    method = 'GET',
    body,
    skipAuth = false,
    retry = true
  } = {}
) {

  const options = {

    method,

    body:
      body !== undefined
        ? JSON.stringify(body)
        : undefined,

    skipAuth
  };


  // ---------------------------------------------------------------
  // First request
  // ---------------------------------------------------------------

  let response = await doFetch(
    path,
    options
  );


  // ---------------------------------------------------------------
  // Access token expired
  // ---------------------------------------------------------------

  if (
    response.status === 401 &&
    !skipAuth &&
    retry &&
    auth.getRefresh()
  ) {

    const refreshed =
      await refreshAccessToken();


    // -------------------------------------------------------------
    // Refresh successful
    // Retry original API request
    // -------------------------------------------------------------

    if (refreshed) {

      response = await doFetch(
        path,
        options
      );
    }
  }


  // ---------------------------------------------------------------
  // Read response
  // ---------------------------------------------------------------

  let data = null;

  const text = await response.text();

  if (text) {

    try {

      data = JSON.parse(text);

    } catch {

      data = text;
    }
  }


  // ---------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------

  if (!response.ok) {

    // Unauthorized even after refresh
    if (
      response.status === 401 &&
      !skipAuth
    ) {

      auth.clear();

      window.dispatchEvent(
        new CustomEvent('vms:session-expired')
      );
    }

    throw new ApiError(
      formatApiError(
        data,
        `Request failed (${response.status})`
      ),
      response.status,
      data
    );
  }


  return data;
}


// ===================================================================
// API METHODS
// ===================================================================

export const api = {

  // ================================================================
  // AUTHENTICATION
  // ================================================================

  login(username, password) {

    return apiRequest(
      '/api/auth/login/',
      {
        method: 'POST',

        body: {
          username,
          password
        },

        // Login does not need JWT
        skipAuth: true,

        // Don't try refresh when login itself fails
        retry: false
      }
    );
  },


  refreshToken() {

    return refreshAccessToken();
  },


  // ================================================================
  // VEHICLES
  // ================================================================

  listVehicles(params = '') {

    return apiRequest(
      `/api/vehicles/${params}`
    );
  },


  getVehicle(id) {

    return apiRequest(
      `/api/vehicles/${id}/`
    );
  },


  createVehicle(data) {

    return apiRequest(
      '/api/vehicles/',
      {
        method: 'POST',
        body: data
      }
    );
  },


  updateVehicle(id, data) {

    return apiRequest(
      `/api/vehicles/${id}/`,
      {
        method: 'PUT',
        body: data
      }
    );
  },


  patchVehicle(id, data) {

    return apiRequest(
      `/api/vehicles/${id}/`,
      {
        method: 'PATCH',
        body: data
      }
    );
  },


  deleteVehicle(id) {

    return apiRequest(
      `/api/vehicles/${id}/`,
      {
        method: 'DELETE'
      }
    );
  },


  // ================================================================
  // DRIVERS
  // ================================================================

  listDrivers(params = '') {

    return apiRequest(
      `/api/drivers/${params}`
    );
  },


  getDriver(id) {

    return apiRequest(
      `/api/drivers/${id}/`
    );
  },


  createDriver(data) {

    return apiRequest(
      '/api/drivers/',
      {
        method: 'POST',
        body: data
      }
    );
  },


  updateDriver(id, data) {

    return apiRequest(
      `/api/drivers/${id}/`,
      {
        method: 'PUT',
        body: data
      }
    );
  },


  patchDriver(id, data) {

    return apiRequest(
      `/api/drivers/${id}/`,
      {
        method: 'PATCH',
        body: data
      }
    );
  },


  deleteDriver(id) {

    return apiRequest(
      `/api/drivers/${id}/`,
      {
        method: 'DELETE'
      }
    );
  },


  // ================================================================
  // ASSIGNMENTS
  // ================================================================

  listAssignments(params = '') {

    return apiRequest(
      `/api/assignments/${params}`
    );
  },


  getAssignment(id) {

    return apiRequest(
      `/api/assignments/${id}/`
    );
  },


  createAssignment(data) {

    return apiRequest(
      '/api/assignments/',
      {
        method: 'POST',
        body: data
      }
    );
  },


  patchAssignment(id, data) {

    return apiRequest(
      `/api/assignments/${id}/`,
      {
        method: 'PATCH',
        body: data
      }
    );
  },


  deleteAssignment(id) {

    return apiRequest(
      `/api/assignments/${id}/`,
      {
        method: 'DELETE'
      }
    );
  },


  // ================================================================
  // DASHBOARD
  // ================================================================

  dashboard() {

    return apiRequest(
      '/api/dashboard/'
    );
  }

};