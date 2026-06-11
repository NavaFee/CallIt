import { AppShell } from '@/components/AppShell';
import { ToastProvider } from '@/components/Toast';

export default function Play() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-page">
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </main>
  );
}
