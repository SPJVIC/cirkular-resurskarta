import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Account } from '../types';
import * as auth from '../services/auth';

interface AuthContextValue {
  accounts: Account[];
  /** Inloggat konto, eller null för besökare */
  account: Account | null;
  register: (input: auth.RegistrationInput) => auth.Result<Account>;
  login: (email: string, password: string) => auth.Result<Account>;
  logout: () => void;
  // Adminåtgärder
  approve: (id: string, actorId: string | null) => void;
  reject: (id: string) => void;
  setActor: (id: string, actorId: string | null) => void;
  removeAccount: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, initialAccounts, initialSessionId }: { children: ReactNode; initialAccounts?: Account[]; initialSessionId?: string | null }) {
  const [accounts, setAccounts] = useState<Account[]>(() => initialAccounts ?? auth.loadAccounts());
  const [sessionId, setSessionId] = useState<string | null>(() => (initialSessionId !== undefined ? initialSessionId : auth.loadSessionId()));

  useEffect(() => auth.saveAccounts(accounts), [accounts]);
  useEffect(() => auth.saveSessionId(sessionId), [sessionId]);

  // Kontot läses alltid ur listan, så admins ändringar slår igenom direkt
  const account = accounts.find((a) => a.id === sessionId) ?? null;
  const isAdmin = auth.isAdmin(account);

  const value: AuthContextValue = {
    accounts,
    account,
    register: (input) => {
      const res = auth.register(accounts, input);
      if (!res.ok) return res;
      setAccounts(res.value.accounts);
      setSessionId(res.value.account.id);
      return { ok: true, value: res.value.account };
    },
    login: (email, password) => {
      const res = auth.login(accounts, email, password);
      if (res.ok) setSessionId(res.value.id);
      return res;
    },
    logout: () => setSessionId(null),
    approve: (id, actorId) => isAdmin && setAccounts((as) => auth.updateAccount(as, id, { status: 'approved', actorId })),
    reject: (id) => isAdmin && setAccounts((as) => auth.updateAccount(as, id, { status: 'rejected' })),
    // Admin kopplar valfri aktör; en medlem kopplar sig själv när den skapar sin aktör
    setActor: (id, actorId) => (isAdmin || id === account?.id) && setAccounts((as) => auth.updateAccount(as, id, { actorId })),
    removeAccount: (id) => isAdmin && id !== account?.id && setAccounts((as) => auth.removeAccount(as, id)),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth måste användas inom AuthProvider');
  return ctx;
}
