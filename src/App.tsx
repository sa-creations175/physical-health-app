import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { runSeedersIfNeeded } from './db';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import LogStrength from './pages/LogStrength';
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
        <Route path="/library" element={<Library />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
