import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { runSeedersIfNeeded } from './db';
import { runCloudSync } from './lib/sync';
import { Capacitor } from '@capacitor/core';
import { isHealthKitAvailable } from './lib/healthkit';
import { importWatchWorkouts } from './lib/watchImport';
import AppLayout from './components/AppLayout';
import { ToastProvider } from './components/ui/Toast';
import Home from './pages/Home';
import Fitness from './pages/Fitness';
import Nutrition from './pages/Nutrition';
import Health from './pages/Health';
import History from './pages/History';
import LogStrength from './pages/LogStrength';
import LogCardio from './pages/LogCardio';
import ActiveSession from './pages/ActiveSession';
import SessionComplete from './pages/SessionComplete';
import Library from './pages/Library';
import ExerciseDetail from './pages/ExerciseDetail';
import Settings from './pages/Settings';

// iOS-only Apple Watch auto-import, gated on HealthKit availability. Fully
// guarded so it can never block or crash startup.
async function importWatchWorkoutsIfAvailable(): Promise<void> {
  if (Capacitor.getPlatform() !== 'ios') return;
  try {
    if (await isHealthKitAvailable()) {
      await importWatchWorkouts();
    }
  } catch (e) {
    console.error('Watch import failed:', e);
  }
}

function App() {
  useEffect(() => {
    // Seed/heal local data first, then run cloud sync (initial push + pull),
    // then auto-import Apple Watch workouts (iOS only). Each phase is
    // best-effort and never blocks local boot.
    runSeedersIfNeeded()
      .then(() => runCloudSync())
      .then(() => importWatchWorkoutsIfAvailable())
      .catch((err) => {
        console.error('Startup (seed/sync/import) failed:', err);
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
          <Route path="/history" element={<History />} />
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
