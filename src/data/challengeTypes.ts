export interface ChallengeType {
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string; // Tailwind color class suffix (e.g. "blue", "purple")
  difficulty: 'Facile' | 'Moyen' | 'Difficile';
  estimatedTime: string; // e.g. "5-15 min"
  instructions: string;
  tips: string[];
}

const challengeTypes: ChallengeType[] = [
  {
    slug: 'typing',
    title: 'Défi de Frappe',
    description: 'Entraîne ta vitesse et ta précision de frappe. Estime le temps nécessaire pour taper un texte donné.',
    icon: '⌨️',
    color: 'blue',
    difficulty: 'Facile',
    estimatedTime: '5-15 min',
    instructions: `Bienvenue dans le défi de frappe ! L'objectif est simple : tu dois taper le texte affiché le plus précisément et rapidement possible.

**Comment ça marche :**
1. Lis d'abord le texte à taper
2. Estime le temps dont tu as besoin pour le taper sans erreurs
3. Lance le timer et commence à taper
4. Compare ton estimation avec ton temps réel`,
    tips: [
      'Lis tout le texte avant de commencer pour avoir une idée de la longueur',
      'Un bon typiste moyen tape 40-60 mots par minute',
      'Privilégie la précision à la vitesse pour les premières sessions',
    ],
  },
  {
    slug: 'truefalse',
    title: 'True or False Blitz',
    description: 'Réponds à 10 questions Vrai/Faux en 5 secondes chacune. La contrainte de temps t\'empêche de procrastiner.',
    icon: '⚡',
    color: 'purple',
    difficulty: 'Facile',
    estimatedTime: '2-3 min',
    instructions: `Bienvenue dans le True or False Blitz ! Tu dois répondre à 10 affirmations sur la productivité et la gestion du temps.

**Comment ça marche :**
1. Lis l'affirmation affichée
2. Réponds Vrai ou Faux en moins de 5 secondes
3. Reçois un feedback immédiat
4. Les questions s'enchaînent automatiquement`,
    tips: [
      'Fais confiance à ton premier instinct',
      'La contrainte de 5 secondes t\'empêche de procrastiner',
      'C\'est la Loi de Parkinson en action !',
    ],
  },
  {
    slug: 'task-planning',
    title: 'Planification des Tâches',
    description: 'Organise et priorise une liste de tâches. Entraîne-toi à estimer le temps de planification.',
    icon: '📋',
    color: 'green',
    difficulty: 'Moyen',
    estimatedTime: '1 min',
    instructions: `Bienvenue dans le défi de planification ! Tu vas devoir organiser une liste de tâches selon leur priorité et importance.

**Comment ça marche :**
1. Prends connaissance de la liste de tâches fournie
2. Estime le temps nécessaire pour les trier et planifier
3. Lance le timer et commence la planification
4. Classe les tâches par ordre de priorité`,
    tips: [
      'Commence par identifier les tâches urgentes et importantes',
      'Groupe les tâches similaires ensemble',
      'Pense à la dépendance entre les tâches',
    ],
  },
];

export default challengeTypes;
