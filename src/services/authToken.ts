const AUTH_TOKEN_KEY = "evfeedback_token";

export function saveAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function readAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY)?.trim() || "";
}

export function removeAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function isAuthenticated() {
  return !!readAuthToken();
}