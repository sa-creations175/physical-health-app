import { createContext, useContext } from 'react';

// What the screen frame (components/AppLayout.tsx) shares with screens: the
// header area a HeaderStrip places itself in, and the scrolling content area.
export interface ScreenFrame {
  headerSlot: HTMLElement | null;
  scrollArea: HTMLElement | null;
}

export const ScreenFrameContext = createContext<ScreenFrame>({ headerSlot: null, scrollArea: null });
export const useScreenFrame = () => useContext(ScreenFrameContext);
