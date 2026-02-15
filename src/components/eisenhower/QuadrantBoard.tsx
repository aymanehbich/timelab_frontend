import { QUADRANT_CONFIG } from './types';

interface QuadrantCardProps {
  quadrant: 1 | 2 | 3 | 4;
  onSelect: (q: number) => void;
  state: 'idle' | 'disabled' | 'correct' | 'wrong' | 'reveal';
}

export default function QuadrantCard({ quadrant, onSelect, state }: QuadrantCardProps) {
  const cfg = QUADRANT_CONFIG[quadrant];
  const clickable = state === 'idle';

  return (
    <div
      className={`
        relative rounded-card border overflow-hidden transition-all duration-200
        ${state === 'correct'  ? 'border-success bg-success-light shadow-card ring-2 ring-success/20' : ''}
        ${state === 'wrong'    ? 'border-error bg-error-light opacity-60' : ''}
        ${state === 'reveal'   ? 'border-success bg-success-light shadow-card ring-2 ring-success/20 animate-pulse' : ''}
        ${state === 'disabled' ? `${cfg.borderColor} bg-background-card opacity-30` : ''}
        ${state === 'idle'     ? `${cfg.borderColor} bg-background-card ${cfg.hoverBorder} hover:shadow-card cursor-pointer active:scale-[0.98]` : ''}
      `}
      onClick={() => clickable && onSelect(quadrant)}
    >
      {/* Content */}
      <div className="p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-full ${cfg.iconBg} flex items-center justify-center`}>
            <span className="text-lg">{cfg.emoji}</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">{cfg.title}</h3>
            <p className="text-xs text-text-muted">{cfg.subtitle}</p>
          </div>
        </div>
        <p className="text-xs text-text-placeholder mt-3">
          {clickable ? cfg.description : '\u00A0'}
        </p>
      </div>

      {/* Bottom bar */}
      {clickable && (
        <div className={`px-5 py-2.5 ${cfg.headerBg} border-t ${cfg.borderColor}`}>
          <p className="text-xs text-text-muted font-medium text-center">Cliquer pour sélectionner</p>
        </div>
      )}

      {/* Badge */}
      {state === 'correct' && (
        <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-success text-white flex items-center justify-center shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      {state === 'wrong' && (
        <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-error text-white flex items-center justify-center shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )}
      {state === 'reveal' && (
        <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-success text-white flex items-center justify-center shadow-sm animate-bounce">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  );
}
