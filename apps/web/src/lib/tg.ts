/**
 * Minimal typed surface of the Telegram Mini App SDK we use.
 * Present only inside the Telegram webview; everything is feature-detected.
 */
export interface TgWebApp {
  initData: string;
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  MainButton?: {
    setParams: (p: { text?: string; color?: string; text_color?: string; is_visible?: boolean }) => void;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  HapticFeedback?: {
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  };
}

export function tgWebApp(): TgWebApp | null {
  if (typeof window === 'undefined') return null;
  const tg = (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
  return tg && tg.initData ? tg : null;
}
