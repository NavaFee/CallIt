import Script from 'next/script';
import { AppShell } from '@/components/AppShell';
import { ToastProvider } from '@/components/Toast';

export default function Play() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-page">
      {/* Telegram Mini App SDK — a no-op outside the Telegram webview */}
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </main>
  );
}
