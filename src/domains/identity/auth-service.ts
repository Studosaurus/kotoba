import type { AuthSession } from "./types";

export interface AuthService {
  getCurrentSession(): Promise<AuthSession | null>;
}

export function createAuthService(): AuthService {
  return {
    async getCurrentSession() {
      return null;
    },
  };
}

