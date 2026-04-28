import { useEffect } from 'react';
import { runSeedersIfNeeded } from './db';

function App() {
  useEffect(() => {
    runSeedersIfNeeded().catch((err) => {
      console.error('Seeder failed:', err);
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-xs tracking-[0.06em] uppercase text-neutral-400">
        Physical Health — Phase 1 scaffold
      </p>
    </div>
  );
}

export default App;
