import { useState } from 'react';
import { ActionCard } from '../components/ActionCard';
import { NarrationLog } from '../components/NarrationLog';
import { StatBar } from '../components/StatBar';
import { Action, GameState } from '../types/game';

type Props = {
  state: GameState;
  onAction: (action: Action, customAction?: string) => void;
};

export function GameScreen({ state, onAction }: Props) {
  const [customInput, setCustomInput] = useState('');
  const { stats, currentRoom, log, selectedClass, roomCount, floor } = state;
  const isResolving = state.phase === 'resolving' || !currentRoom;

  const handleCustomAction = () => {
    if (!customInput.trim() || !currentRoom) return;
    const customAct: Action = {
      id: 'custom',
      label: customInput.trim(),
      effectHint: 'Custom action — anything could happen.',
    };
    onAction(customAct, customInput.trim());
    setCustomInput('');
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 text-gray-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between border-b border-gray-800 pb-3">
          <div>
            <span className="text-sm font-bold tracking-widest text-purple-300">DUNGEONS & DELIVERABLES</span>
          </div>
          <div className="flex gap-4 text-xs text-gray-400">
            <span>Floor {floor}</span>
            <span>Room {roomCount}</span>
            <span className="text-amber-400">{selectedClass?.emoji} {selectedClass?.name}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
              <h3 className="mb-4 text-xs font-bold tracking-widest text-purple-300">📊 PROJECT METRICS</h3>
              <StatBar label="Budget" value={stats.budget} emoji="💰" />
              <StatBar label="Client Happiness" value={stats.clientHappiness} emoji="😊" />
              <StatBar label="Team Morale" value={stats.teamMorale} emoji="💪" />
              <StatBar label="Delivery Progress" value={stats.deliveryProgress} emoji="🚀" />
              <StatBar label="Technical Debt" value={stats.technicalDebt} emoji="🕷️" inverted />
              <StatBar label="Compliance Risk" value={stats.complianceRisk} emoji="⚖️" inverted />
            </div>
            <NarrationLog entries={log} />
          </div>

          <div className="lg:col-span-2">
            {isResolving ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-gray-800 bg-gray-900">
                <div className="mb-4 animate-bounce text-4xl">⚔️</div>
                <p className="animate-pulse text-sm tracking-widest text-purple-300">
                  {!currentRoom ? 'LOADING NEXT ROOM...' : 'THE DUNGEON MASTER DELIBERATES...'}
                </p>
              </div>
            ) : (
              <>
                <div className={`mb-4 rounded-xl border p-4 ${currentRoom.isBoss ? 'border-red-700 shadow-lg shadow-red-900/30' : 'border-gray-800 bg-gray-900'}`}>
                  <div className="mb-2 flex items-start justify-between">
                    <h2 className={`text-lg font-bold ${currentRoom.isBoss ? 'text-red-400' : 'text-purple-300'}`}>
                      {currentRoom.roomName}
                    </h2>
                    {currentRoom.isBoss && (
                      <span className="rounded border border-red-800 bg-red-900/30 px-2 py-1 text-xs font-bold text-red-400">
                        FINAL BOSS
                      </span>
                    )}
                  </div>
                  <p className="mb-4 text-sm leading-relaxed text-gray-300">{currentRoom.description}</p>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/20 px-3 py-1.5">
                    <span className="text-xs font-bold text-red-400">👹 ENEMY:</span>
                    <span className="text-sm font-semibold text-red-300">{currentRoom.enemy}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="mb-3 text-xs font-bold tracking-widest text-purple-300">⚔️ CHOOSE YOUR ACTION</h3>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {currentRoom.actions.map((action) => (
                      <ActionCard key={action.id} action={action} onSelect={(chosen) => onAction(chosen)} disabled={isResolving} />
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                  <h3 className="mb-2 text-xs font-bold tracking-widest text-gray-400">✍️ OR WRITE YOUR OWN ACTION</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customInput}
                      onChange={(event) => setCustomInput(event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && handleCustomAction()}
                      placeholder="e.g. Propose a blockchain solution..."
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-purple-600 focus:outline-none"
                    />
                    <button
                      onClick={handleCustomAction}
                      disabled={!customInput.trim() || isResolving}
                      className="cursor-pointer rounded-lg bg-purple-700 px-4 py-2 text-sm text-white transition-colors hover:bg-purple-600 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-600"
                    >
                      GO
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
