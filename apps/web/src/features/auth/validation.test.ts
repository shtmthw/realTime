import { describe, expect, it } from 'vitest';
import { validateSignIn, validateSignUp } from './validation';

describe('validateSignUp', () => {
  it('accepts valid input (case-insensitive usernames)', () => {
    expect(
      validateSignUp({ username: 'Alice_01', email: 'a@b.co', password: 'longenough' }),
    ).toEqual({});
  });

  it('flags each invalid field', () => {
    const errors = validateSignUp({ username: 'a b', email: 'nope', password: 'short' });
    expect(Object.keys(errors).sort()).toEqual(['email', 'password', 'username']);
  });

  it('rejects usernames that are too short or too long', () => {
    expect(
      validateSignUp({ username: 'ab', email: 'a@b.co', password: 'longenough' }).username,
    ).toBeTruthy();
    expect(
      validateSignUp({ username: 'a'.repeat(21), email: 'a@b.co', password: 'longenough' })
        .username,
    ).toBeTruthy();
  });
});

describe('validateSignIn', () => {
  it('requires both fields', () => {
    expect(validateSignIn({ identifier: ' ', password: '' })).toEqual({
      identifier: 'Enter your username or email',
      password: 'Enter your password',
    });
    expect(validateSignIn({ identifier: 'alice', password: 'x' })).toEqual({});
  });
});
