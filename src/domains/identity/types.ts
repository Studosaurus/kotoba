export interface AuthenticatedUser {
  id: string;
  email?: string;
  displayName?: string;
}

export interface AuthSession {
  user: AuthenticatedUser;
  expiresAt?: number;
}

