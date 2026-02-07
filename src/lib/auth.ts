const KEY = "auth_token";

export function isAuthed(): boolean {
  return Boolean(sessionStorage.getItem(KEY) || localStorage.getItem(KEY));
}

export function getToken(): string | null {
  // Prefer sessionStorage (current tab); fall back to localStorage (persists across tabs/restarts).
  // This ensures the Bearer header is always sent, which bypasses CSRF validation on the server.
  return sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
}

export function setToken(token: string) {
  sessionStorage.setItem(KEY, token);
  try {
    localStorage.setItem(KEY, token);
  } catch {
    // localStorage might be unavailable in some environments
  }
}

export function signOut() {
  sessionStorage.removeItem(KEY);
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
