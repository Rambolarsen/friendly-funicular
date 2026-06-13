import { useEffect, useState } from 'react';
import { SocketClient } from '../game/network/SocketClient';
import { ConsultantClass } from '../types/game';
import type { LobbyUpdatePayload, RoomJoinedPayload } from '../types/multiplayer';

type Props = {
  selectedClass: ConsultantClass;
  onJoined: (socket: SocketClient, roomId: string) => void;
  onBack: () => void;
};

interface RoomInfo {
  id: string;
  playerCount: number;
  timeSurvived: number;
}

export function LobbyScreen({ selectedClass, onJoined, onBack }: Props) {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const sc = SocketClient.getInstance();

    const offLobby = sc.onLobbyUpdate((p: LobbyUpdatePayload) => {
      setRooms(p.rooms);
    });

    const offJoined = sc.onRoomJoined((p: RoomJoinedPayload) => {
      onJoined(sc, p.roomId);
    });

    return () => {
      offLobby();
      offJoined();
    };
  }, [onJoined]);

  const join = (roomId: string | null) => {
    if (joining) {
      return;
    }

    setJoining(true);
    const sc = SocketClient.getInstance();
    sc.joinRoom({
      roomId,
      classId: selectedClass.id,
      name: `${selectedClass.emoji} ${selectedClass.name}`,
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-start overflow-y-auto bg-gray-950 p-6 text-gray-100">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl">🌐</div>
          <h1
            className="text-2xl font-black tracking-widest text-purple-300"
            style={{ fontFamily: 'Cinzel Decorative, serif' }}
          >
            MULTIPLAYER LOBBY
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Playing as {selectedClass.emoji} {selectedClass.name}
          </p>
        </div>

        <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 text-xs font-bold tracking-widest text-purple-300">⚔️ ACTIVE GAMES</h2>
          {rooms.length === 0 ? (
            <p className="text-sm italic text-gray-500">No games running. Start one below!</p>
          ) : (
            <div className="flex flex-col gap-2">
              {rooms.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-4 py-2"
                >
                  <div>
                    <span className="text-sm font-bold text-green-400">🟢 Game #{r.id}</span>
                    <span className="ml-3 text-xs text-gray-400">
                      {r.playerCount} player{r.playerCount !== 1 ? 's' : ''} — {r.timeSurvived}s survived
                    </span>
                  </div>
                  <button
                    onClick={() => join(r.id)}
                    disabled={joining}
                    className="rounded-lg bg-blue-700 px-3 py-1 text-xs font-bold text-white hover:bg-blue-600 disabled:opacity-50"
                  >
                    JOIN
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => join(null)}
            disabled={joining}
            className="flex-1 rounded-xl bg-purple-700 px-6 py-3 font-bold tracking-widest text-white hover:bg-purple-600 disabled:opacity-50"
          >
            ＋ NEW GAME
          </button>
          <button
            onClick={onBack}
            className="rounded-xl border border-gray-700 px-6 py-3 font-bold text-gray-400 hover:bg-gray-800"
          >
            ← BACK
          </button>
        </div>
      </div>
    </div>
  );
}
