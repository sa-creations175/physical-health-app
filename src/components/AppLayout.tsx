import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import { ScreenFrameContext } from '../lib/screenFrame';

// The screen frame every screen uses: the Mint header on top, locked in
// place; one content area below it that scrolls (and bounces, on iOS) on its
// own, sliding up behind the header's green line; and the tab bar locked at
// the bottom. The frame itself fills the screen and never moves.
//
// Each screen's HeaderStrip places itself in the frame's header area. The
// content area is a size container, so a screen can use its visible height
// (100cqh) to fill exactly one screen, as Home and Fitness do.
export default function AppLayout() {
  // The workout session screen is a focus screen: its own footer (Save for
  // later / Finish session) takes the tab bar's place.
  const { pathname } = useLocation();
  const inSession = pathname.startsWith('/log/strength/active/');
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  const [scrollArea, setScrollArea] = useState<HTMLElement | null>(null);

  // A new screen starts at the top of the content area.
  useEffect(() => {
    scrollArea?.scrollTo({ top: 0 });
  }, [pathname, scrollArea]);

  return (
    <ScreenFrameContext.Provider value={{ headerSlot, scrollArea }}>
      <div className="fixed inset-0 flex flex-col bg-paper text-ink">
        <div ref={setHeaderSlot} className="shrink-0 w-full max-w-md mx-auto" />
        <main
          ref={setScrollArea}
          className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain"
          style={{ containerType: 'size' }}
        >
          <div className="w-full max-w-md mx-auto min-h-full flex flex-col">
            <Outlet />
          </div>
        </main>
        {!inSession && <BottomNav />}
      </div>
    </ScreenFrameContext.Provider>
  );
}
