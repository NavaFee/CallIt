import { PlayScreen } from '@/components/PlayScreen';
import { ToastProvider } from '@/components/Toast';

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-page">
      <ToastProvider>
        <PlayScreen />
      </ToastProvider>
    </main>
  );
}
