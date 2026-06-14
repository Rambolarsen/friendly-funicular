import { useEffect, useState } from 'react';

/**
 * Returns true when the runtime looks like a mobile/touch phone.
 * Uses both maxTouchPoints and (pointer: coarse) to exclude touchscreen laptops/desktops,
 * which report maxTouchPoints > 0 but still use a fine pointer (mouse).
 */
export function useIsMobile(): boolean {
  const isPhone = () =>
    navigator.maxTouchPoints > 0 &&
    window.matchMedia('(pointer: coarse)').matches;

  const [mobile, setMobile] = useState(isPhone);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const handler = () => setMobile(isPhone());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return mobile;
}
