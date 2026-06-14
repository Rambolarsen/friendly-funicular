import { useEffect, useState } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

export function RotatePrompt() {
  const isMobile = useIsMobile();
  const [isPortrait, setIsPortrait] = useState(
    () => window.matchMedia('(orientation: portrait)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const handler = () => setIsPortrait(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    // Attempt to lock orientation; silently ignored by browsers that don't support it (e.g. Safari)
    screen.orientation?.lock('landscape').catch(() => undefined);
  }, [isMobile]);

  if (!isMobile || !isPortrait) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-gray-950 text-gray-100">
      <div className="text-6xl">🔄</div>
      <p className="text-xl font-bold tracking-widest text-purple-300">
        Please rotate your device
      </p>
      <p className="text-sm text-gray-400">
        This game is best played in landscape orientation.
      </p>
    </div>
  );
}
