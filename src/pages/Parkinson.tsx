import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import challengeTypes from '../data/challengeTypes';
import TypingChallengePage from './TypingChallengePage';
import TrueFalseBlitzPage from './TrueFalseBlitzPage';
import TaskPlanningChallenge from './TaskPlanningChallenge';

/**
 * Dispatcher: reads the :type slug from the URL and renders
 * the correct challenge-specific component.
 * Route: /parkinson/:type
 */
export default function Parkinson() {
  const { type: slug } = useParams<{ type: string }>();
  const navigate = useNavigate();

  const challengeType = challengeTypes.find((c) => c.slug === slug);

  // Unknown slug
  if (!challengeType) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-text mb-2">Type de défi introuvable</h2>
          <p className="text-text-muted mb-6 text-sm">Ce type de défi n'existe pas encore.</p>
          <button
            onClick={() => navigate('/parkinson')}
            className="bg-primary text-white px-5 py-2 rounded-button text-sm hover:bg-primary-hover transition-colors"
          >
            Retour aux défis
          </button>
        </div>
      </Layout>
    );
  }

  // ── Typing challenge ──────────────────────────────────────────────────
  if (slug === 'typing') {
    return <TypingChallengePage />;
  }

  // ── True or False Blitz ───────────────────────────────────────────────
  if (slug === 'truefalse') {
    return <TrueFalseBlitzPage />;
  }

  // ── Day Planner Challenge ─────────────────────────────────────────────
  if (slug === 'task-planning') {
    return <TaskPlanningChallenge />;
  }

  // ── Other challenge types (coming soon) ───────────────────────────────
  return (
    <Layout>
      <div className="space-y-6">
        <button
          onClick={() => navigate('/parkinson')}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Tous les défis
        </button>

        <div className="bg-background-card rounded-card border border-border-light p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-3xl flex-shrink-0">
              {challengeType.icon}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-text">{challengeType.title}</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                  {challengeType.difficulty}
                </span>
              </div>
              <p className="text-text-muted text-sm mt-1">{challengeType.description}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">🚧</div>
          <h2 className="text-xl font-bold text-text mb-2">Bientôt disponible</h2>
          <p className="text-text-muted text-sm">Ce défi est en cours de développement.</p>
        </div>
      </div>
    </Layout>
  );
}
