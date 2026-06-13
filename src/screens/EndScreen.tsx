import { StatBar } from '../components/StatBar';
import { GameState } from '../types/game';

type Props = {
  state: GameState;
  onRestart: () => void;
};

export function EndScreen({ state, onRestart }: Props) {
  const { outcome, stats, loseReason, finalReport, selectedClass } = state;
  const isWin = outcome === 'win';

  return (
    <div className="flex min-h-screen flex-col items-center overflow-y-auto bg-gray-950 p-6 text-gray-100">
      <div className="w-full max-w-2xl">
        <div className={`mb-8 rounded-2xl border-2 p-6 text-center ${isWin ? 'border-green-600 bg-green-900/20' : 'border-red-700 bg-red-900/10'}`}>
          <div className="mb-4 text-6xl">{isWin ? '🏆' : '💀'}</div>
          <h1
            className={`mb-2 text-3xl font-black tracking-widest ${isWin ? 'text-green-400' : 'text-red-400'}`}
            style={{ fontFamily: 'Cinzel Decorative, serif' }}
          >
            {isWin ? 'PROJECT DELIVERED' : 'PROJECT CANCELLED'}
          </h1>
          {loseReason && <p className="mt-2 text-sm italic text-red-300">{loseReason}</p>}
          <p className="mt-2 text-sm text-gray-400">
            {selectedClass?.emoji} {selectedClass?.name} — {selectedClass?.abilityName}
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-4 text-xs font-bold tracking-widest text-purple-300">📊 FINAL PROJECT METRICS</h2>
          <StatBar label="Budget" value={stats.budget} emoji="💰" />
          <StatBar label="Client Happiness" value={stats.clientHappiness} emoji="😊" />
          <StatBar label="Team Morale" value={stats.teamMorale} emoji="💪" />
          <StatBar label="Delivery Progress" value={stats.deliveryProgress} emoji="🚀" />
          <StatBar label="Technical Debt" value={stats.technicalDebt} emoji="🕷️" inverted />
          <StatBar label="Compliance Risk" value={stats.complianceRisk} emoji="⚖️" inverted />
        </div>

        <div className="mb-6 rounded-xl border border-amber-900 bg-gray-900 p-6">
          <h2 className="mb-4 text-sm font-bold tracking-widest text-amber-400">
            📜 {isWin ? 'FINAL DELIVERY REPORT' : 'PROJECT POST-MORTEM'}
          </h2>
          {finalReport ? (
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-gray-300">
              {finalReport}
            </pre>
          ) : (
            <p className="animate-pulse text-sm italic text-gray-500">Generating report...</p>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={onRestart}
            className="cursor-pointer rounded-xl bg-purple-700 px-8 py-4 text-lg font-bold tracking-widest text-white transition-all duration-200 hover:bg-purple-600 active:scale-95"
          >
            🔄 NEW ENGAGEMENT
          </button>
        </div>
      </div>
    </div>
  );
}
