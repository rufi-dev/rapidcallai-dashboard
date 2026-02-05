const FLAG = "auth_ok";

export function isAuthed(): boolean {
  return Boolean(sessionStorage.getItem(FLAG));
}

export function getToken(): string | null {
  return null;
}

export function setToken(token: string) {
  void token;
  sessionStorage.setItem(FLAG, "1");
}

export function signOut() {
  sessionStorage.removeItem(FLAG);
  try {
    localStorage.removeItem("auth_token");
  } catch {
    // ignore
  }
}


