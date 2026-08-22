'use client';

import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

/** Always-visible EN/IT control (login + all admin pages). */
export default function GlobalLanguageDock({
  position = 'bottom-right',
}: {
  position?: 'bottom-right' | 'top-right';
}) {
  const pos =
    position === 'top-right'
      ? 'top-3 right-3'
      : 'bottom-4 right-4';

  return (
    <div
      className={`fixed ${pos} z-[10000] notranslate shadow-lg rounded-lg`}
      data-nosnippet
    >
      <LanguageSwitcher variant="dock" />
    </div>
  );
}
