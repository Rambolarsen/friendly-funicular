import { useEffect, useRef } from 'react';
import { LogEntry } from '../types/game';

type Props = { entries: LogEntry[] };

export function NarrationLog({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  return (
    <div className="h-48 overflow-y-auto rounded-lg border border-gray-800 bg-gray-950 p-3 font-mono text-xs">
      {entries.length === 0 && <p className="italic text-gray-600">The dungeon is silent...</p>}
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={`mb-2 leading-relaxed ${
            entry.type === 'narration'
              ? 'text-amber-200'
              : entry.type === 'stat'
                ? 'text-cyan-400'
                : entry.type === 'room'
                  ? 'font-bold text-purple-300'
                  : 'text-gray-400'
          }`}
        >
          {entry.type === 'narration' && '📜 '}
          {entry.type === 'stat' && '📊 '}
          {entry.type === 'room' && '🚪 '}
          {entry.text}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
