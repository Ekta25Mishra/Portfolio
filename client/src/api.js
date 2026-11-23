const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}/api${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers
    }
  });
  const type = response.headers.get('content-type') || '';
  const result = type.includes('application/json') ? await response.json() : null;
  if (!response.ok) {
    const error = new Error(result?.message || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return result;
}

export const json = (method, body) => ({ method, body: JSON.stringify(body) });
