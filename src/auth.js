/**
 * Auth module - JWT authentication con bcrypt
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'autobank-secret-dev';
const TOKEN_EXPIRY = '30d';

function ensureDataDir() {
  const dir = path.dirname(USERS_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function loadUsers() {
  try {
    if (existsSync(USERS_FILE)) {
      return JSON.parse(readFileSync(USERS_FILE, 'utf8'));
    }
  } catch {}
  return {};
}

function saveUsers(users) {
  ensureDataDir();
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

/**
 * Registra un nuovo utente
 */
export async function signup(email, password, name) {
  const users = loadUsers();
  const normalizedEmail = email.toLowerCase().trim();

  if (users[normalizedEmail]) {
    throw new Error('Email gia registrata');
  }

  if (password.length < 6) {
    throw new Error('La password deve avere almeno 6 caratteri');
  }

  const hash = await bcrypt.hash(password, 12);
  users[normalizedEmail] = {
    email: normalizedEmail,
    name: name || normalizedEmail.split('@')[0],
    passwordHash: hash,
    createdAt: new Date().toISOString(),
    consents: [],
  };
  saveUsers(users);

  const token = jwt.sign({ email: normalizedEmail }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  return {
    token,
    user: { email: normalizedEmail, name: users[normalizedEmail].name },
  };
}

/**
 * Login
 */
export async function login(email, password) {
  const users = loadUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const user = users[normalizedEmail];

  if (!user) throw new Error('Credenziali non valide');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Credenziali non valide');

  const token = jwt.sign({ email: normalizedEmail }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  return {
    token,
    user: { email: normalizedEmail, name: user.name },
  };
}

/**
 * Middleware per proteggere route
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token mancante' });
  }

  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    req.userEmail = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: 'Token non valido o scaduto' });
  }
}

/**
 * Verifica token senza bloccare
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Salva consent per utente
 */
export function saveUserConsent(email, consentToken) {
  const users = loadUsers();
  const user = users[email];
  if (!user) return;
  if (!user.consents) user.consents = [];
  if (!user.consents.includes(consentToken)) {
    user.consents.push(consentToken);
  }
  saveUsers(users);
}

/**
 * Ottieni consents utente
 */
export function getUserConsentsFromAuth(email) {
  const users = loadUsers();
  return users[email]?.consents || [];
}
