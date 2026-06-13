import { useEffect, useRef } from 'react';
import { ConsultantClass } from '../types/game';
import { CLASS_SPRITE_DATA, makeBasePixels } from '../constants/classSprites';

type Props = {
  cls: ConsultantClass;
  onSelect: (cls: ConsultantClass) => void;
  selected?: boolean;
};

const DISPLAY_SIZE = 48;
const SPRITE_SIZE  = 24;
const SCALE        = DISPLAY_SIZE / SPRITE_SIZE;

function SpriteCanvas({ classId }: { classId: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = CLASS_SPRITE_DATA[classId];
    if (!data) return;

    ctx.clearRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE);
    const pixels = makeBasePixels(data.color, data.hat, data.item);
    pixels.forEach((color, i) => {
      if (!color) return;
      const x = i % SPRITE_SIZE;
      const y = Math.floor(i / SPRITE_SIZE);
      ctx.fillStyle = color;
      ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
    });
  }, [classId]);

  return (
    <canvas
      ref={ref}
      width={DISPLAY_SIZE}
      height={DISPLAY_SIZE}
      style={{ imageRendering: 'pixelated' }}
      aria-hidden="true"
    />
  );
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
        <SpriteCanvas classId={cls.id} />
      </div>
      <div className="mb-1 text-sm font-bold" style={{ color: cls.color }}>{cls.name}</div>
      <div className="mb-2 text-xs font-semibold italic text-amber-400">✨ {cls.abilityName}</div>
      <div className="mb-2 text-xs text-gray-400">{cls.description}</div>
      <div className="text-xs italic text-gray-500">"{cls.flavor}"</div>
    </button>
  );
}
