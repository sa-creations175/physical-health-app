import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { runSeedersIfNeeded } from './db';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import LogStrength from './pages/LogStrength';
import ActiveSession from './pages/ActiveSession';
import SessionComplete from './pages/SessionComplete';
import Library from './pages/Library';
import Settings from './pages/Settings';

function App() {
  useEffect(() => {
    runSeedersIfNeeded().catch((err) => {
      console.error('Seeder failed:', err);
    });
  }, []);

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/log/strength" element={<LogStrength />} />
        <Route path="/log/strength/active/:sessionId" element={<ActiveSession />} />
        <Route path="/log/strength/complete/:sessionId" element={<SessionComplete />} />
        <Route path="/library" element={<Library />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
