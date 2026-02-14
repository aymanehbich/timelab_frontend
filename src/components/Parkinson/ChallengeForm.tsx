import { useState } from 'react';

interface ChallengeFormProps {
  onSubmit: (data: ChallengeFormData) => Promise<void>;
  onCancel?: () => void;
}

interface ChallengeFormData {
  title: string;
  description: string;
  estimated_duration: number;
}

export default function ChallengeForm({ onSubmit, onCancel }: ChallengeFormProps) {
  const [formData, setFormData] = useState<ChallengeFormData>({
    title: '',
    description: '',
    estimated_duration: 30,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      setFormData({
        title: '',
        description: '',
        estimated_duration: 30,
      });
    } catch (error) {
      console.error('Error submitting challenge:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background-card rounded-card border border-border-light p-6">
      <h2 className="text-xl font-semibold text-text mb-4">
        Create New Challenge
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-text mb-1"
          >
            Challenge Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="e.g., Complete project documentation"
            className="w-full px-4 py-2 bg-background border border-border rounded-button text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-text mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            placeholder="What needs to be done?"
            className="w-full px-4 py-2 bg-background border border-border rounded-button text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Duration Slider */}
        <div>
          <label
            htmlFor="estimated_duration"
            className="block text-sm font-medium text-text mb-1"
          >
            Estimated Duration: <span className="text-primary">{formData.estimated_duration} minutes</span>
          </label>
          <input
            type="range"
            id="estimated_duration"
            name="estimated_duration"
            min="5"
            max="240"
            step="5"
            value={formData.estimated_duration}
            onChange={handleChange}
            className="w-full h-2 bg-background-secondary rounded-full appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>5 min</span>
            <span>1 hour</span>
            <span>2 hours</span>
            <span>4 hours</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !formData.title}
            className="flex-1 bg-primary text-white py-2.5 px-4 rounded-button hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            {loading ? 'Creating...' : 'Start Challenge'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 border border-border rounded-button hover:bg-background-secondary transition-colors text-text-secondary text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
