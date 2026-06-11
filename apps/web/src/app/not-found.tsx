import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center px-8 text-center"
      style={{ background: 'radial-gradient(circle at 50% 22%, #131A2C, #07090F 70%)' }}
    >
      <div
        className="flex h-[84px] w-[84px] items-center justify-center rounded-full font-display text-[36px]"
        style={{
          background: 'radial-gradient(circle at 32% 28%, #FFE08A, #FFC53D 55%, #D89B12)',
          boxShadow: 'inset 0 -4px 0 #B97E0A, inset 0 4px 0 #FFEDB3',
          border: '3px solid #E9A718',
          color: '#5B3D00',
          transform: 'rotate(12deg)',
        }}
      >
        ?
      </div>
      <h1 className="mt-6 font-display text-[40px] text-ink">MISSED PAGE</h1>
      <p className="mt-2 text-[14px] font-bold text-muted">
        This one settled out of the money — the chart is still waiting for you.
      </p>
      <Link
        href="/"
        className="ci-pressable mt-8 inline-flex h-[56px] items-center rounded-[18px] px-8 font-ui text-[17px] font-black text-[#3A2700]"
        style={{
          background: 'linear-gradient(180deg, #FFE08A 0%, #FFC53D 42%)',
          boxShadow: '0 6px 0 #B97E0A, 0 12px 26px rgba(255,197,61,0.4)',
        }}
      >
        BACK TO THE CHART
      </Link>
    </main>
  );
}
