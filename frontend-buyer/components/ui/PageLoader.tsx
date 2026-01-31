'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function PageLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const prevPathRef = useRef<string | null>(null);
  const isInitialMount = useRef(true);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    // Don't show loader on initial mount/page reload
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevPathRef.current = pathname;
      return;
    }

    // Only show loader if pathname actually changed
    if (pathname !== prevPathRef.current && prevPathRef.current !== null) {
      // Clear any existing timeouts
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];

      setLoading(true);
      setIsClosing(false);
      setShouldRender(true);
      prevPathRef.current = pathname;
      
      // Faster transition - only show for 150ms minimum, max 500ms
      const minTimer = setTimeout(() => {
        setIsClosing(true);
        setLoading(false);
        // Wait for fade out animation before unmounting
        const closeTimer = setTimeout(() => {
          setShouldRender(false);
          setIsClosing(false);
        }, 150);
        timeoutRefs.current.push(closeTimer);
      }, 150);
      timeoutRefs.current.push(minTimer);

      // Maximum display time to prevent hanging
      const maxTimer = setTimeout(() => {
        setIsClosing(true);
        setLoading(false);
        const closeTimer = setTimeout(() => {
          setShouldRender(false);
          setIsClosing(false);
        }, 150);
        timeoutRefs.current.push(closeTimer);
      }, 500);
      timeoutRefs.current.push(maxTimer);

      return () => {
        timeoutRefs.current.forEach(clearTimeout);
        timeoutRefs.current = [];
      };
    } else {
      // Update ref even if pathname didn't change (for initial load)
      prevPathRef.current = pathname;
    }
  }, [pathname]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
      setShouldRender(false);
      setIsClosing(false);
      setLoading(false);
    };
  }, []);

  if (!shouldRender) return null;

  return (
    <div className={`fixed inset-0 z-[9999] bg-white/60 backdrop-blur-sm flex items-center justify-center transition-opacity duration-150 ${
      isClosing ? 'opacity-0' : 'opacity-100'
    }`}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-3 border-[#0066CC]/20 rounded-full"></div>
          <div className="absolute inset-0 border-3 border-transparent border-t-[#0066CC] rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
}

