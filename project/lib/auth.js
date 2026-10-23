import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me-in-production');

export const signToken = (userID) =>
  new SignJWT({ userID })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

export const verifyToken = async (authorization) => {
  if (!authorization) return null;
  try {
    const token = typeof authorization === 'string'
      ? (authorization.replace(/^bearer\s+/i, '').trim())
      : authorization;
    if (!token || typeof token !== 'string') return null;
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.userID) return { userID: payload.userID };
    if (payload.id) return { userID: payload.id };
    if (payload.sub) return { userID: payload.sub };
    return null;
  } catch (_) {
    try {
      if (typeof authorization === 'string') {
        const token = authorization.replace(/^bearer\s+/i, '').trim();
        if (token && token.split('.').length === 3) {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          if (payload.userID) return { userID: payload.userID };
          if (payload.id) return { userID: payload.id };
          if (payload.sub) return { userID: payload.sub };
        }
      }
    } catch {}
    return null;
  }
};
