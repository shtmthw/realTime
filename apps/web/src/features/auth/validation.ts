// Mirrors the server rules so people get instant feedback; the server remains the authority.
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export function validateSignUp(v: {
  username: string;
  email: string;
  password: string;
}): FieldErrors<'username' | 'email' | 'password'> {
  const errors: FieldErrors<'username' | 'email' | 'password'> = {};
  if (!USERNAME_RE.test(v.username.trim().toLowerCase())) {
    errors.username = 'Use 3–20 letters, numbers or underscores';
  }
  if (!EMAIL_RE.test(v.email.trim())) errors.email = 'Enter a valid email address';
  if (v.password.length < 8) errors.password = 'Use at least 8 characters';
  return errors;
}

export function validateSignIn(v: {
  identifier: string;
  password: string;
}): FieldErrors<'identifier' | 'password'> {
  const errors: FieldErrors<'identifier' | 'password'> = {};
  if (!v.identifier.trim()) errors.identifier = 'Enter your username or email';
  if (!v.password) errors.password = 'Enter your password';
  return errors;
}
