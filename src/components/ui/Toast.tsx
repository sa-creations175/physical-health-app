import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

// Minimal ephemeral toast. Single line, auto-dismisses ~2s after show,
// tap-to-dismiss, positioned bottom-center above the bottom nav.
// First consumer is cardio save (Build 2.1); built generic so nutrition /
// mobility / etc. land their saves in the same affordance later.

const DEFAULT_DURATION_MS = 2000;

interface ToastContextValue {
  showToast: (text: string, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showToast = useCallback(
    (text: string, durationMs: number = DEFAULT_DURATION_MS) => {
      clearTimer();
      setMessage(text);
      timerRef.current = window.setTimeout(() => {
        setMessage(null);
        timerRef.current = null;
      }, durationMs);
    },
    [clearTimer],
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  function handleDismiss() {
    clearTimer();
    setMessage(null);
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message !== null && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 bg-charcoal text-ink border border-card-edge rounded-xl px-4 py-2.5 text-[13px] font-medium shadow-md max-w-[88vw] whitespace-nowrap overflow-hidden text-ellipsis z-[60]"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 84px)' }}
        >
          {message}
        </button>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
