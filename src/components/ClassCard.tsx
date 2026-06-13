import { ConsultantClass } from '../types/game';

type Props = {
  cls: ConsultantClass;
  onSelect: (cls: ConsultantClass) => void;
  selected?: boolean;
};

export function ClassCard({ cls, onSelect, selected }: Props) {
  return (
    <button
      onClick={() => onSelect(cls)}
      className={`
        cursor-pointer rounded-xl border-2 p-4 text-left transition-all duration-200
        ${selected
          ? 'border-purple-400 bg-purple-900/40 shadow-lg shadow-purple-900/50'
          : 'border-gray-700 bg-gray-900 hover:border-purple-600 hover:bg-gray-800'
        }
      `}
    >
      <div className="mb-2 text-3xl">{cls.emoji}</div>
      <div className="mb-1 text-sm font-bold text-purple-200">{cls.name}</div>
      <div className="mb-2 text-xs font-semibold italic text-amber-400">✨ {cls.abilityName}</div>
      <div className="mb-2 text-xs text-gray-400">{cls.description}</div>
      <div className="text-xs italic text-gray-500">"{cls.flavor}"</div>
    </button>
  );
}
