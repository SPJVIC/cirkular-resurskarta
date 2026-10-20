import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './state/AppContext';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import MatchAnalysis from './components/MatchAnalysis';
import Toasts from './components/Toasts';
import MapPage from './pages/MapPage';
import MatchesPage from './pages/MatchesPage';
import ActorsPage from './pages/ActorsPage';

export default function App() {
  return (
    <AppProvider>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="flex h-full min-h-0 flex-col">
          <Header />
          <StatsBar />
          <main className="min-h-0 flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<MapPage />} />
              <Route path="/matchningar" element={<MatchesPage />} />
              <Route path="/aktorer" element={<ActorsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        <MatchAnalysis />
        <Toasts />
      </HashRouter>
    </AppProvider>
  );
}
