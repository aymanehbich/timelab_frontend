// ── Quiz types ──

export interface QuizTask {
  id: number;
  title: string;
  description: string;
  level: number;
}

export interface QuizCompleted {
  message: string;
  completed: true;
}

export interface SubmitResponse {
  is_correct: boolean;
  correct_quadrant: number;
  chosen_quadrant: number;
  explanation: string;
  points_earned: number;
}

export interface QuizProgress {
  total_tasks: number;
  attempted: number;
  correct: number;
  incorrect: number;
  remaining: number;
  score_percentage: number;
  total_points_earned: number;
}

export interface LevelProgress extends QuizProgress {
  level: number;
}

export interface ProgressResponse {
  overall: QuizProgress;
  levels: LevelProgress[];
}

export interface ReviewTask {
  id: number;
  title: string;
  description: string;
  quadrant: number;
  explanation: string;
  level: number;
}

// ── Level config ──

export const LEVEL_CONFIG = {
  1: { name: 'Débutant', emoji: '🌱', color: 'text-success', bg: 'bg-success/10', border: 'border-success/30' },
  2: { name: 'Intermédiaire', emoji: '📈', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' },
  3: { name: 'Avancé', emoji: '🏆', color: 'text-error', bg: 'bg-error/10', border: 'border-error/30' },
} as const;

// ── Quadrant config (reused for the matrix UI) ──

export const QUADRANT_CONFIG = {
  1: {
    title: 'Faire en premier',
    subtitle: 'Urgent et Important',
    emoji: '🔴',
    description: 'Crises, délais, problèmes',
    borderColor: 'border-error/30',
    bgColor: 'bg-error-light',
    dotColor: 'bg-error',
    headerBg: 'bg-error/10',
    hoverBorder: 'hover:border-error/60',
    iconBg: 'bg-error/10',
  },
  2: {
    title: 'Planifier',
    subtitle: 'Non Urgent et Important',
    emoji: '🔵',
    description: 'Planification, croissance, prévention',
    borderColor: 'border-primary/30',
    bgColor: 'bg-primary/5',
    dotColor: 'bg-primary',
    headerBg: 'bg-primary/10',
    hoverBorder: 'hover:border-primary/60',
    iconBg: 'bg-primary/10',
  },
  3: {
    title: 'Déléguer',
    subtitle: 'Urgent et Non Important',
    emoji: '🟡',
    description: 'Interruptions, certaines réunions',
    borderColor: 'border-warning/30',
    bgColor: 'bg-warning-light',
    dotColor: 'bg-warning',
    headerBg: 'bg-warning/10',
    hoverBorder: 'hover:border-warning/60',
    iconBg: 'bg-warning/10',
  },
  4: {
    title: 'Éliminer',
    subtitle: 'Non Urgent et Non Important',
    emoji: '⚫',
    description: 'Perte de temps, distractions',
    borderColor: 'border-border',
    bgColor: 'bg-background-secondary',
    dotColor: 'bg-text-muted',
    headerBg: 'bg-background-secondary',
    hoverBorder: 'hover:border-text-muted/60',
    iconBg: 'bg-background-secondary',
  },
} as const;
