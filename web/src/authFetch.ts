// fetch with the saved login token, for routes that need a logged-in user.
export function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let token: string | null = null;
  try {
    token = localStorage.getItem('jassToken');
  } catch {
    /* storage unavailable */
  }
  const headers = { ...(init.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { ...init, headers });
}
