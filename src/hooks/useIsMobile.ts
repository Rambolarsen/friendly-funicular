import { useEffect, useState } from 'react';

/**
 * Returns true when the runtime looks like a touch device narrower than 1280px.
 * Re-evaluates if the window is resized across the breakpoint.
 */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    () => navigator.maxTouchPoints > 0 && window.innerWidth < 1280,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1279px)');
    const handler = () => setMobile(navigator.maxTouchPoints > 0 && mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return mobile;
}
