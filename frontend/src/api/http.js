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

export async function apiStream(path, { method = 'GET', onEvent } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { Accept: 'text/event-stream' }
    });
  } catch {
    throw new Error(
      'Cannot connect to the server. Check the backend URL and network.'
    );
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const result = await response.json();
      message = result.message || message;
    } catch {
      // Keep the HTTP status message when the server did not return JSON.
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error('The server does not support streamed responses.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let resultData;
  let receivedResult = false;

  function processEvent(block) {
    let event = 'message';
    const dataLines = [];

    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    }

    if (!dataLines.length) return;

    let payload;
    try {
      payload = JSON.parse(dataLines.join('\n'));
    } catch {
      throw new Error('The server sent an invalid streamed event.');
    }

    if (event === 'error') {
      throw new Error(payload.message || 'The streamed request failed.');
    }

    if (event === 'result') {
      resultData = payload.data;
      receivedResult = true;
    }

    onEvent?.(event, payload);
  }

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });

      let boundary = buffer.search(/\r?\n\r?\n/);
      while (boundary !== -1) {
        const separator = buffer.slice(boundary).match(/^\r?\n\r?\n/)[0];
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + separator.length);
        processEvent(block);
        boundary = buffer.search(/\r?\n\r?\n/);
      }

      if (done) break;
    }

    if (buffer.trim()) processEvent(buffer);
  } finally {
    reader.releaseLock();
  }

  if (!receivedResult) {
    throw new Error('The streamed response ended before a result was received.');
  }

  return resultData;
}

export function jsonBody(payload) {
  return JSON.stringify(payload);
}