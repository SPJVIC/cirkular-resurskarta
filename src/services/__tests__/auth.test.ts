import { describe, expect, it } from 'vitest';
import { getSeedData } from '../../data/seed';
import { canCreateActor, canEditActor, getSeedAccounts, login, register, updateAccount } from '../auth';

const input = { name: 'Test Testsson', email: 'Test@Exempel.se', organisation: 'Test AB', password: 'hemligt', message: '' };

describe('konton', () => {
  it('registrering skapar ett väntande medlemskonto', () => {
    const res = register(getSeedAccounts(), input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.account).toMatchObject({ email: 'test@exempel.se', role: 'member', status: 'pending', actorId: null });
    expect(res.value.account.passwordHash).not.toContain('hemligt');
  });

  it('nekar dubbla e-postadresser, ogiltig e-post och korta lösenord', () => {
    const first = register(getSeedAccounts(), input);
    if (!first.ok) throw new Error();
    expect(register(first.value.accounts, input).ok).toBe(false);
    expect(register(getSeedAccounts(), { ...input, email: 'inte-epost' }).ok).toBe(false);
    expect(register(getSeedAccounts(), { ...input, password: '123' }).ok).toBe(false);
  });

  it('inloggning kräver rätt lösenord', () => {
    const res = register([], input);
    if (!res.ok) throw new Error();
    expect(login(res.value.accounts, 'test@exempel.se', 'hemligt').ok).toBe(true);
    expect(login(res.value.accounts, 'test@exempel.se', 'fel').ok).toBe(false);
  });
});

describe('behörighet', () => {
  const data = getSeedData();
  const accounts = getSeedAccounts();
  const byId = (id: string) => accounts.find((a) => a.id === id)!;

  it('besökare får inte redigera eller skapa', () => {
    expect(canEditActor(null, 'a01', data)).toBe(false);
    expect(canCreateActor(null, data)).toBe(false);
  });

  it('admin får redigera allt', () => {
    expect(canEditActor(byId('u-admin'), 'a02', data)).toBe(true);
    expect(canCreateActor(byId('u-admin'), data)).toBe(true);
  });

  it('medlem får bara redigera sin egen aktör och inte skapa fler', () => {
    const member = byId('u-a01');
    expect(canEditActor(member, 'a01', data)).toBe(true);
    expect(canEditActor(member, 'a02', data)).toBe(false);
    expect(canCreateActor(member, data)).toBe(false);
  });

  it('väntande eller återkallade konton får inget', () => {
    expect(canCreateActor(byId('u-pending'), data)).toBe(false);
    const revoked = updateAccount(accounts, 'u-a01', { status: 'rejected' }).find((a) => a.id === 'u-a01')!;
    expect(canEditActor(revoked, 'a01', data)).toBe(false);
  });

  it('godkänd medlem utan aktör får skapa en', () => {
    const approved = updateAccount(accounts, 'u-pending', { status: 'approved' }).find((a) => a.id === 'u-pending')!;
    expect(canCreateActor(approved, data)).toBe(true);
  });
});
