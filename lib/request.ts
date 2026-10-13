type RequestOptions = {
  baseUrl: string;
  path: string;
  method: string;
  token?: string;
  body?: object;
  timeoutMs?: number;
};

export async function apiRequest<T>({ baseUrl, path, method, token, body, timeoutMs = 8000 }: RequestOptions): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    // Keep the deadline active while the response body is being downloaded.
    const text = await response.text();
    let result: unknown;
    try { result = JSON.parse(text); }
    catch { throw Object.assign(new Error('The Gym Buddy API returned an invalid response. Try again.'), { status: response.status }); }
    if (!response.ok) {
      const message = result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
        ? result.error : 'Request failed.';
      throw Object.assign(new Error(message), { status: response.status });
    }
    return result as T;
  } catch (error) {
    if (timedOut) throw new Error('The Gym Buddy API did not respond in time. Try again.');
    if (error instanceof Error && 'status' in error) throw error;
    throw new Error('Cannot reach the Gym Buddy API. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
}
