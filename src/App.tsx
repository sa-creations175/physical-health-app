import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { runSeedersIfNeeded } from './db';
import AppLayout from './components/AppLayout';
import { ToastProvider } from './components/ui/Toast';
import Home from './pages/Home';
import Fitness from './pages/Fitness';
import Nutrition from './pages/Nutrition';
import Health from './pages/Health';
import LogStrength from './pages/LogStrength';
import LogCardio from './pages/LogCardio';
import ActiveSession from './pages/ActiveSession';
import SessionComplete from './pages/SessionComplete';
import Library from './pages/Library';
import ExerciseDetail from './pages/ExerciseDetail';
import Settings from './pages/Settings';

function App() {
  useEffect(() => {
    runSeedersIfNeeded().catch((err) => {
      console.error('Seeder failed:', err);
    });
  }, []);

  return (
    <ToastProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/fitness" element={<Fitness />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/health" element={<Health />} />
          <Route path="/log/strength" element={<LogStrength />} />
          <Route path="/log/strength/active/:sessionId" element={<ActiveSession />} />
          <Route path="/log/strength/complete/:sessionId" element={<SessionComplete />} />
          <Route path="/log/cardio" element={<LogCardio />} />
          <Route path="/library" element={<Library />} />
          <Route path="/library/:exerciseId" element={<ExerciseDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}

export default App;
