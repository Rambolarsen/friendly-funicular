interface HomeConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function HomeConfirmDialog({ onConfirm, onCancel }: HomeConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="w-full max-w-sm rounded-2xl border-2 border-purple-700 bg-gray-950 p-8 text-center"
        style={{ boxShadow: '0 0 40px rgba(124, 58, 237, 0.3)' }}
      >
        <div className="mb-4 text-5xl">📋</div>
        <h2
          className="mb-2 text-xl font-black tracking-widest text-purple-300"
          style={{ fontFamily: 'Cinzel Decorative, serif' }}
        >
          RESIGN CONTRACT?
        </h2>
        <p className="mb-6 text-sm italic text-gray-400">
          The client will escalate to your manager.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onConfirm}
            className="cursor-pointer rounded-xl bg-purple-700 px-6 py-3 text-sm font-bold tracking-widest text-white transition-all duration-200 hover:bg-purple-600 active:scale-95"
          >
            RESIGN
          </button>
          <button
            onClick={onCancel}
            className="cursor-pointer rounded-xl border border-gray-700 bg-gray-800 px-6 py-3 text-sm font-bold tracking-widest text-gray-300 transition-all duration-200 hover:bg-gray-700 active:scale-95"
          >
            STAY ON PROJECT
          </button>
        </div>
      </div>
    </div>
  );
}
