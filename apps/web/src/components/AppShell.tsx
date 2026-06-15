'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { tgWebApp } from '@/lib/tg';
import { telegramLogin, type TgWidgetConfig } from '@/lib/tgAuth';
import { PlayScreen } from './PlayScreen';
import { ProfileScreen } from './ProfileScreen';
import { RanksScreen } from './RanksScreen';

type Tab = 'play' | 'ranks' | 'profile';

const TABS: Array<{ id: Tab; label: string; glyph: string }> = [
  { id: 'play', label: 'PLAY', glyph: '◉' },
  { id: 'ranks', label: 'RANKS', glyph: '♛' },
  { id: 'profile', label: 'PROFILE', glyph: '★' },
];

const BANNER_KEY = 'callit_guest_banner_dismissed';

export function AppShell() {
  const [tab, setTab] = useState<Tab>('play');
  const [address, setAddress] = useState<string | null>(null);
  const [tgLinked, setTgLinked] = useState(true); // assume linked until told otherwise
  const [tgWidget, setTgWidget] = useState<TgWidgetConfig | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(true);

  const refresh = useCallback(() => {
    api
      .session()
      .then((res) => {
        setAddress(res.session?.address ?? null);
        setTgLinked(res.tgLinked ?? false);
        setTgWidget(res.tgWidget ?? null);
      })
      .catch(() => {});
  }, []);

  useEffect(refresh, [refresh, tab]);
  useEffect(() => {
    try {
      setBannerDismissed(localStorage.getItem(BANNER_KEY) === '1');
    } catch {
      // storage blocked — keep the banner off rather than undismissable
    }
    window.addEventListener('callit:session-changed', refresh);
    return () => window.removeEventListener('callit:session-changed', refresh);
  }, [refresh]);

  const guestBanner =
    !bannerDismissed && address !== null && !tgLinked && tgWidget !== null && tgWebApp() === null;

  return (
    <div className="relative min-h-dvh">
      {/* guest mode strip: persistent until linked, dismissible */}
      {guestBanner && (
        <div
          className="flex items-center gap-2 border-b px-4 py-1.5 shadow-none lg:fixed lg:bottom-6 lg:right-6 lg:z-40 lg:max-w-[315px] lg:rounded-full lg:border lg:px-3 lg:py-2 lg:shadow-[0_12px_28px_rgba(0,0,0,0.28)]"
          style={{ borderColor: 'rgba(255,197,61,0.35)', background: 'rgba(255,197,61,0.08)' }}
          data-testid="guest-banner"
        >
          <span className="flex-1 text-[10.5px] font-bold text-muted">
            <span className="font-black text-gold">Guest mode</span>
            <span className="lg:hidden"> — link Telegram to secure your account</span>
            <span className="hidden lg:inline"> · secure account</span>
          </span>
          <button
            type="button"
            className="ci-pressable whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-black text-[#04203D]"
            style={{ background: 'linear-gradient(180deg, #8FC6FF, var(--sui) 60%)' }}
            data-testid="guest-banner-link"
            onClick={() => {
              if (!tgWidget) return;
              telegramLogin('link')
                .then((res) => res && setTgLinked(true))
                .catch(() => {});
            }}
          >
            LINK
          </button>
          <button
            type="button"
            aria-label="dismiss guest banner"
            className="px-1 text-[13px] font-black text-muted"
            data-testid="guest-banner-close"
            onClick={() => {
              setBannerDismissed(true);
              try {
                localStorage.setItem(BANNER_KEY, '1');
              } catch {
                // session-only dismissal is fine
              }
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* keep PlayScreen mounted so polls/overlays survive tab switches */}
      <div style={{ display: tab === 'play' ? 'block' : 'none' }}>
        <PlayScreen />
      </div>
      {tab === 'ranks' && <RanksScreen />}
      {tab === 'profile' && <ProfileScreen address={address} />}

      {/* desktop is a single HUD page (ranks + streak inline, wallet/profile
          in the top-chip modal); tabs stay on mobile web + the Mini App */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line lg:hidden"
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
