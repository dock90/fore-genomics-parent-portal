const REDIRECT_KEY = "fg_auth_redirect_url";

export function storeAuthRedirect(redirectUrl: string | null | undefined) {
  try {
    if (redirectUrl && redirectUrl !== "/" && redirectUrl !== "") {
      sessionStorage.setItem(REDIRECT_KEY, redirectUrl);
    } else {
      sessionStorage.removeItem(REDIRECT_KEY);
    }
  } catch {
    // sessionStorage unavailable — post-auth falls back to Health Hub routing
  }
}

export function readStoredAuthRedirect(): string | null {
  try {
    return sessionStorage.getItem(REDIRECT_KEY);
  } catch {
    return null;
  }
}

export function clearStoredAuthRedirect() {
  try {
    sessionStorage.removeItem(REDIRECT_KEY);
  } catch {
    // ignore
  }
}
