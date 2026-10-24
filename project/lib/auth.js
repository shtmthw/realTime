import { jwtVerify, SignJWT } from 'jose';

// Read lazily so the value is always the one dotenv/compose injected.
const getSecret = () =>
  new TextEncoder().encode(
    process.env.JWT_SECRET || 'dev-secret-change-me-in-production'
  );

const normalizeUserId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const signToken = (userID) => {
  const id = normalizeUserId(userID);
  if (!id) throw new Error('Cannot sign a token without a user id');
  return new SignJWT({ userID: id })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getSecret());
};

/**
 * Verify a JWT from an Authorization header (with or without the "Bearer "
 * prefix). Returns `{ userID }` only when the signature and expiry are valid.
 * There is deliberately no unverified decode fallback: an invalid or expired
 * token must behave exactly like a missing one.
 */
export const verifyToken = async (authorization) => {
  if (!authorization || typeof authorization !== 'string') return null;
  const token = authorization.replace(/^bearer\s+/i, '').trim();
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userID = normalizeUserId(
      payload.userID ?? payload.id ?? payload.sub
    );
    return userID ? { userID } : null;
  } catch {
    return null;
  }
};
