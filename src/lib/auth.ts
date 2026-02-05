const KEY = "auth_token";

export function isAuthed(): boolean {
  return Boolean(sessionStorage.getItem(KEY));
}

export function getToken(): string | null {
  return sessionStorage.getItem(KEY);
}

export function setToken(token: string) {
  sessionStorage.setItem(KEY, token);
}

export function signOut() {
  sessionStorage.removeItem(KEY);
  try {
    localStorage.removeItem("auth_token");
  } catch {
    // ignore
  }
}


