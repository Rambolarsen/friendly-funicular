type StatBarProps = {
  label: string;
  value: number;
  max?: number;
  inverted?: boolean;
  emoji: string;
};

export function StatBar({ label, value, max = 100, inverted = false, emoji }: StatBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  let color = 'bg-green-500';
  if (inverted) {
    if (pct > 75) color = 'bg-red-500';
    else if (pct > 50) color = 'bg-orange-500';
    else if (pct > 25) color = 'bg-yellow-500';
  } else if (pct < 25) color = 'bg-red-500';
  else if (pct < 50) color = 'bg-orange-500';
  else if (pct < 75) color = 'bg-yellow-500';

  const isWarning = inverted ? pct > 75 : pct < 25;

  return (
    <div className={`mb-2 ${isWarning ? 'animate-pulse' : ''}`}>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-gray-300">{emoji} {label}</span>
        <span className={`font-bold ${isWarning ? 'text-red-400' : 'text-gray-200'}`}>{value}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className={`h-2.5 rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
