const AUTH_TOKEN_KEY = "evfeedback_token";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getAuthTokenStorageKey() {
  return AUTH_TOKEN_KEY;
}

export function saveAuthToken(token: string) {
  if (!canUseStorage()) return;

  const normalizedToken = token.trim();

  if (!normalizedToken) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }

  localStorage.setItem(AUTH_TOKEN_KEY, normalizedToken);
}

export function readAuthToken() {
  if (!canUseStorage()) return "";

  return localStorage.getItem(AUTH_TOKEN_KEY)?.trim() || "";
}

export function removeAuthToken() {
  if (!canUseStorage()) return;

  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function hasAuthToken() {
  return !!readAuthToken();
}