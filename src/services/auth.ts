import type { Account, DataState } from '../types';
import { newId, today } from './dataStore';

/**
 * Simulerade konton för demon. Allt ligger i webbläsarens localStorage, så det
 * här är INTE säkert – det visar flödet (registrering → godkännande → redigering).
 * Vid en riktig lösning ersätts modulen av en backend (t.ex. Supabase Auth +
 * radnivåregler) med samma funktioner: register, login, approve, canEditActor.
 */

export const ACCOUNTS_KEY = 'cirkular-resurskarta:accounts:v1';
export const SESSION_KEY = 'cirkular-resurskarta:session:v1';

/** Enkel, synkron hash (FNV-1a) saltad med e-post. Endast för demo. */
export function hashPassword(email: string, password: string): string {
  let h = 0x811c9dc5;
  const s = `${normalizeEmail(email)}:${password}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Demokonton. Inloggningsuppgifterna står i README. */
export function getSeedAccounts(): Account[] {
  const make = (a: Omit<Account, 'passwordHash' | 'message' | 'createdAt'> & { password: string; message?: string; createdAt?: string }): Account => {
    const { password, ...rest } = a;
    return { message: '', createdAt: '2026-10-01', ...rest, passwordHash: hashPassword(a.email, password) };
  };
  return [
    make({
      id: 'u-admin',
      name: 'Administratör',
      email: 'admin@demo.se',
      organisation: 'Science Park Jönköping',
      password: 'admin123',
      role: 'admin',
      status: 'approved',
      actorId: null,
    }),
    make({
      id: 'u-a01',
      name: 'Demoanvändare Värmeverk',
      email: 'varmeverk@demo.se',
      organisation: 'Vätterstrand Värmeverk',
      password: 'demo123',
      role: 'member',
      status: 'approved',
      actorId: 'a01',
    }),
    make({
      id: 'u-pending',
      name: 'Demoansökan Snickeri',
      email: 'snickeri@demo.se',
      organisation: 'Tranås Möbelsnickeri (fiktivt)',
      password: 'demo123',
      role: 'member',
      status: 'pending',
      actorId: null,
      message: 'Vi har träspill och sågspån som vi vill hitta mottagare för.',
      createdAt: '2026-10-20',
    }),
  ];
}

export interface RegistrationInput {
  name: string;
  email: string;
  organisation: string;
  password: string;
  message: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function register(accounts: Account[], input: RegistrationInput): Result<{ accounts: Account[]; account: Account }> {
  const email = normalizeEmail(input.email);
  if (!input.name.trim() || !input.organisation.trim()) return { ok: false, error: 'Fyll i namn och organisation.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Ange en giltig e-postadress.' };
  if (input.password.length < 6) return { ok: false, error: 'Lösenordet måste ha minst 6 tecken.' };
  if (accounts.some((a) => a.email === email)) return { ok: false, error: 'Det finns redan ett konto med den e-postadressen.' };
  const account: Account = {
    id: newId('u'),
    name: input.name.trim(),
    email,
    organisation: input.organisation.trim(),
    message: input.message.trim(),
    passwordHash: hashPassword(email, input.password),
    role: 'member',
    status: 'pending',
    actorId: null,
    createdAt: today(),
  };
  return { ok: true, value: { accounts: [...accounts, account], account } };
}

export function login(accounts: Account[], email: string, password: string): Result<Account> {
  const account = accounts.find((a) => a.email === normalizeEmail(email));
  if (!account || account.passwordHash !== hashPassword(email, password)) return { ok: false, error: 'Fel e-post eller lösenord.' };
  return { ok: true, value: account };
}

export function updateAccount(accounts: Account[], id: string, patch: Partial<Pick<Account, 'status' | 'actorId' | 'role'>>): Account[] {
  return accounts.map((a) => (a.id === id ? { ...a, ...patch } : a));
}

export function removeAccount(accounts: Account[], id: string): Account[] {
  return accounts.filter((a) => a.id !== id);
}

// --- Behörighet -------------------------------------------------------------

export const isAdmin = (a: Account | null) => a?.role === 'admin' && a.status === 'approved';
export const isApprovedMember = (a: Account | null) => a?.status === 'approved';

/** Kontots aktör, men bara om den fortfarande finns (admin kan ha tagit bort den). */
export function ownActorId(a: Account | null, data: DataState): string | null {
  if (!a?.actorId) return null;
  return data.actors.some((x) => x.id === a.actorId) ? a.actorId : null;
}

/** Admin redigerar allt, godkända medlemmar bara sin egen aktör. Besökare inget. */
export function canEditActor(a: Account | null, actorId: string, data: DataState): boolean {
  if (isAdmin(a)) return true;
  return isApprovedMember(a) && ownActorId(a, data) === actorId;
}

/** Godkända medlemmar får registrera en egen aktör om de inte redan har en. */
export function canCreateActor(a: Account | null, data: DataState): boolean {
  if (isAdmin(a)) return true;
  return isApprovedMember(a) && ownActorId(a, data) === null;
}

// --- Persistens -------------------------------------------------------------

export function loadAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Account[]) : null;
    return Array.isArray(parsed) ? parsed : getSeedAccounts();
  } catch {
    return getSeedAccounts();
  }
}

export function saveAccounts(accounts: Account[]): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    /* localStorage kan saknas – konton lever då bara i minnet */
  }
}

export function loadSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function saveSessionId(id: string | null): void {
  try {
    if (id) localStorage.setItem(SESSION_KEY, id);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* se ovan */
  }
}
