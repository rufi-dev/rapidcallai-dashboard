const KEY = "auth_token";

export function isAuthed(): boolean {
  return Boolean(localStorage.getItem(KEY));
}

export function getToken(): string | null {
  return localStorage.getItem(KEY);
}

export function setToken(token: string) {
  localStorage.setItem(KEY, token);
}

export function signOut() {
  localStorage.removeItem(KEY);
}


