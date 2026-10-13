const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'
).replace(/\/$/, '');

export async function apiRequest(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...options.headers
      }
    });
  } catch {
    throw new Error(
      'Cannot connect to the server. Check the backend URL and network.'
    );
  }

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      response.ok
        ? 'The server returned an invalid response.'
        : `Request failed with status ${response.status}.`
    );
  }

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || `Request failed with status ${response.status}.`
    );
  }

  // Fallback if the API returns a wrapper object or a direct array/object
  return result.data !== undefined ? result.data : result;
}

export function jsonBody(payload) {
  return JSON.stringify(payload);
}