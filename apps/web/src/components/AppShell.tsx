'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PlayScreen } from './PlayScreen';
import { ProfileScreen } from './ProfileScreen';
import { RanksScreen } from './RanksScreen';

type Tab = 'play' | 'ranks' | 'profile';

const TABS: Array<{ id: Tab; label: string; glyph: string }> = [
  { id: 'play', label: 'PLAY', glyph: '◉' },
  { id: 'ranks', label: 'RANKS', glyph: '♛' },
  { id: 'profile', label: 'PROFILE', glyph: '★' },
];

export function AppShell() {
  const [tab, setTab] = useState<Tab>('play');
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    api.session().then((res) => setAddress(res.session?.address ?? null)).catch(() => {});
  }, [tab]);

  return (
    <div className="relative min-h-dvh">
      {/* keep PlayScreen mounted so polls/overlays survive tab switches */}
      <div style={{ display: tab === 'play' ? 'block' : 'none' }}>
        <PlayScreen />
      </div>
      {tab === 'ranks' && <RanksScreen />}
      {tab === 'profile' && <ProfileScreen address={address} />}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line"
        style={{ background: 'rgba(11,14,22,0.92)', backdropFilter: 'blur(12px)' }}
        data-testid="tab-bar"
      >
        <div className="mx-auto flex max-w-md items-stretch">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="flex flex-1 flex-col items-center gap-0.5 pb-[max(env(safe-area-inset-bottom),10px)] pt-2.5"
                data-testid={`tab-${t.id}`}
              >
                <span className="text-[16px]" style={{ color: active ? 'var(--gold)' : 'var(--muted)' }}>
                  {t.glyph}
                </span>
                <span
                  className="text-[9px] font-black tracking-[0.12em]"
                  style={{ color: active ? 'var(--gold)' : 'var(--muted)' }}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
