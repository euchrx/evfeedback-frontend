const AUTH_TOKEN_KEY = "evfeedback_token";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function getAuthTokenStorageKey() {
  return AUTH_TOKEN_KEY;
}

export function saveAuthToken(token: string, persistent = false) {
  if (!canUseStorage()) return;

  const normalizedToken = token.trim();

  if (!normalizedToken) {
    removeAuthToken();
    return;
  }

  const targetStorage = persistent ? localStorage : sessionStorage;
  const otherStorage = persistent ? sessionStorage : localStorage;

  otherStorage.removeItem(AUTH_TOKEN_KEY);
  targetStorage.setItem(AUTH_TOKEN_KEY, normalizedToken);
}

export function readAuthToken() {
  if (!canUseStorage()) return "";

  return (
    localStorage.getItem(AUTH_TOKEN_KEY)?.trim() ||
    sessionStorage.getItem(AUTH_TOKEN_KEY)?.trim() ||
    ""
  );
}

export function isAuthTokenPersistent() {
  return canUseStorage() && !!localStorage.getItem(AUTH_TOKEN_KEY)?.trim();
}

export function removeAuthToken() {
  if (!canUseStorage()) return;

  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
}

export function hasAuthToken() {
  return !!readAuthToken();
}
