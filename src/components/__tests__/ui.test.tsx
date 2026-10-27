import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AppProvider } from '../../state/AppContext';
import { AuthProvider } from '../../state/AuthContext';
import { getSeedAccounts } from '../../services/auth';
import { getSeedData } from '../../data/seed';
import ActorPanel from '../ActorPanel';
import StatsBar from '../StatsBar';
import MatchesPage from '../../pages/MatchesPage';
import ActorsPage from '../../pages/ActorsPage';

const wrap = (ui: ReactNode, sessionId: string | null = 'u-admin') =>
  render(
    <AuthProvider initialAccounts={getSeedAccounts()} initialSessionId={sessionId}>
      <AppProvider initialData={getSeedData()}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          {ui}
          <StatsBar />
        </MemoryRouter>
      </AppProvider>
    </AuthProvider>,
  );

describe('gränssnitt', () => {
  beforeEach(() => localStorage.clear());

  it('aktörsvyn listar 40 aktörer', () => {
    wrap(<ActorsPage />);
    expect(screen.getAllByTestId('actor-row')).toHaveLength(40);
  });

  it('matchningsvyn visar matchningskort med knappar', () => {
    wrap(<MatchesPage />);
    const cards = screen.getAllByTestId('match-card');
    expect(cards.length).toBeGreaterThanOrEqual(15);
    expect(within(cards[0]).getByText('Visa på karta')).toBeInTheDocument();
    expect(within(cards[0]).getByText('Analysera matchning')).toBeInTheDocument();
  });

  it('aktörspanelen växlar samarbetsläge', () => {
    const seed = getSeedData();
    wrap(<ActorPanel actor={seed.actors.find((a) => a.id === 'a34')!} />);
    fireEvent.click(screen.getByRole('button', { name: /Visa möjliga samarbeten/ }));
    expect(screen.getByRole('button', { name: /Återgå till standardvy/ })).toBeInTheDocument();
    expect(screen.getByText(/Kan leverera till/)).toBeInTheDocument();
  });

  it('identifierade resurser kan läggas till och räknar om matchningar', () => {
    const seed = getSeedData();
    wrap(<ActorPanel actor={seed.actors.find((a) => a.id === 'a14')!} />);
    const before = Number(screen.getByTestId('stat-Matchningar').textContent);
    const flowsBefore = Number(screen.getByTestId('stat-Resursflöden').textContent);
    fireEvent.click(screen.getByRole('button', { name: /Identifiera resurser/ }));
    expect(screen.getAllByText('EJ VERIFIERAD').length).toBeGreaterThanOrEqual(3);
    fireEvent.click(screen.getAllByRole('button', { name: 'Lägg till' })[0]);
    expect(Number(screen.getByTestId('stat-Resursflöden').textContent)).toBe(flowsBefore + 1);
    expect(Number(screen.getByTestId('stat-Matchningar').textContent)).toBeGreaterThan(before);
  });

  it('besökare ser aktören men inga redigeringsknappar', () => {
    const seed = getSeedData();
    wrap(<ActorPanel actor={seed.actors.find((a) => a.id === 'a14')!} />, null);
    expect(screen.getByRole('button', { name: /Visa möjliga samarbeten/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Redigera/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Identifiera resurser/ })).not.toBeInTheDocument();
  });

  it('godkänd medlem kan redigera sin egen aktör men inte andras', () => {
    const seed = getSeedData();
    const { unmount } = wrap(<ActorPanel actor={seed.actors.find((a) => a.id === 'a01')!} />, 'u-a01');
    expect(screen.getByRole('button', { name: /Redigera/ })).toBeInTheDocument();
    expect(screen.getByText('Din verksamhet')).toBeInTheDocument();
    unmount();
    wrap(<ActorPanel actor={seed.actors.find((a) => a.id === 'a02')!} />, 'u-a01');
    expect(screen.queryByRole('button', { name: /Redigera/ })).not.toBeInTheDocument();
  });
});
