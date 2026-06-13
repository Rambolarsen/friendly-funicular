import { Action } from '../types/game';

type Props = {
  action: Action;
  onSelect: (action: Action) => void;
  disabled?: boolean;
};

export function ActionCard({ action, onSelect, disabled }: Props) {
  return (
    <button
      onClick={() => !disabled && onSelect(action)}
      disabled={disabled}
      className={`
        group w-full rounded-lg border p-4 text-left transition-all duration-200
        ${disabled
          ? 'cursor-not-allowed border-gray-700 bg-gray-900 opacity-50'
          : 'cursor-pointer border-purple-700 bg-gray-900 hover:border-purple-400 hover:bg-purple-900/40 active:scale-95'
        }
      `}
    >
      <div className="mb-1 text-sm font-semibold text-purple-200 group-hover:text-white">
        ⚔️ {action.label}
      </div>
      <div className="text-xs italic text-gray-400">{action.effectHint}</div>
    </button>
  );
}
