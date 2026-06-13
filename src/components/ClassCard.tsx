import { ConsultantClass } from '../types/game';

type Props = {
  cls: ConsultantClass;
  onSelect: (cls: ConsultantClass) => void;
  selected?: boolean;
};

function spriteStyle(frame: number): React.CSSProperties {
  const col = frame % 9;
  const row = Math.floor(frame / 9);
  return {
    width: 48,
    height: 48,
    imageRendering: 'pixelated',
    backgroundImage: "url('/assets/sprites/chars.png')",
    backgroundSize: '448px 148px',
    backgroundPosition: `-${col * 50}px -${row * 50}px`,
    backgroundRepeat: 'no-repeat',
    display: 'inline-block',
  };
}

export function ClassCard({ cls, onSelect, selected }: Props) {
  return (
    <button
      onClick={() => onSelect(cls)}
      style={{
        borderColor: selected ? cls.color : undefined,
        boxShadow: selected ? `0 0 12px ${cls.color}55` : undefined,
      }}
      className={`
        cursor-pointer rounded-xl border-2 p-4 text-left transition-all duration-200
        ${selected
          ? 'bg-gray-900'
          : 'border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800'
        }
      `}
    >
      <div className="mb-2">
        <span style={spriteStyle(cls.spriteFrame)} aria-hidden="true" />
      </div>
      <div className="mb-1 text-sm font-bold" style={{ color: cls.color }}>{cls.name}</div>
      <div className="mb-2 text-xs font-semibold italic text-amber-400">✨ {cls.abilityName}</div>
      <div className="mb-2 text-xs text-gray-400">{cls.description}</div>
      <div className="text-xs italic text-gray-500">"{cls.flavor}"</div>
    </button>
  );
}
