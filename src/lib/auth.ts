const KEY = "demo_auth_token";

export function isAuthed(): boolean {
  return Boolean(localStorage.getItem(KEY));
}

export function signIn(email: string, _password: string) {
  // Demo auth: store a token locally. Replace with server auth later.
  localStorage.setItem(KEY, `token:${email}:${Date.now()}`);
}

export function signOut() {
  localStorage.removeItem(KEY);
}


