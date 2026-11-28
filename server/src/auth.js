import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

export const COOKIE_NAME = 'portfolio_admin';
export const COOKIE_AGE = 4 * 60 * 60 * 1000;

export function cookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'strict',
    secure: isProduction,
    maxAge: COOKIE_AGE,
    path: '/'
  };
}

function safeCredentialMatch(candidate = '', expected = '') {
  const candidateBytes = Buffer.from(String(candidate), 'utf8');
  const expectedBytes = Buffer.from(String(expected), 'utf8');
  const candidateHash = crypto.createHash('sha256').update(candidateBytes).digest();
  const expectedHash = crypto.createHash('sha256').update(expectedBytes).digest();
  return crypto.timingSafeEqual(candidateHash, expectedHash) && candidateBytes.length === expectedBytes.length;
}

export function credentialsMatch(username, password) {
  return safeCredentialMatch(username, process.env.ADMIN_USERNAME || '') &&
    safeCredentialMatch(password, process.env.ADMIN_PASSWORD || '');
}

export function createAdminToken() {
  return jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '4h' });
}

export function requireAdmin(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.admin !== true) return res.status(401).json({ message: 'Authentication required.' });
    return next();
  } catch {
    return res.status(401).json({ message: 'Authentication required.' });
  }
}
