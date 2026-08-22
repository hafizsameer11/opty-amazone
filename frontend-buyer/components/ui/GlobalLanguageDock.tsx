'use client';

import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

/** Always-visible EN/IT control (auth pages, mobile, any layout without a header switcher). */
export default function GlobalLanguageDock({
  position = 'bottom-right',
}: {
  position?: 'bottom-right' | 'top-right';
}) {
  const pos =
    position === 'top-right'
      ? 'top-3 right-3'
      : 'bottom-20 right-3 sm:bottom-4 sm:right-4';

  return (
    <div
      className={`fixed ${pos} z-[10000] notranslate shadow-lg rounded-lg`}
      data-nosnippet
    >
      <LanguageSwitcher variant="dock" />
    </div>
  );
}
