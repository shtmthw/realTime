import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export const signToken = (userID) =>
  new SignJWT({ userID })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

export const verifyToken = async (authorization) => {
  if (!authorization) return null;
  try {
    const { payload } = await jwtVerify(authorization, JWT_SECRET);
    return { userID: payload.userID };
  } catch (_) {
    return null;
  }
};
