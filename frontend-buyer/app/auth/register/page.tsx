'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy URL — send users to the buyer/seller chooser. */
export default function RegisterRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/auth/choose');
  }, [router]);
  return null;
}
