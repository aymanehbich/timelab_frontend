import type { QuizTask, QuizCompleted, SubmitResponse, ProgressResponse, ReviewTask } from './types';

const BASE_URL = 'http://localhost:8000/api/eisenhower';

const headers = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
});

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: headers(), ...options });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `API error ${res.status}`);
  // Handle Laravel's { data: ... } wrapper if present
  return json.data !== undefined ? json.data : json;
}

export const eisenhowerApi = {
  getNext: (level?: number) =>
    request<QuizTask | QuizCompleted>(`${BASE_URL}/next${level ? `?level=${level}` : ''}`),

  submit: (taskId: number, chosenQuadrant: number) =>
    request<SubmitResponse>(`${BASE_URL}/submit`, {
      method: 'POST',
      body: JSON.stringify({ task_id: taskId, chosen_quadrant: chosenQuadrant }),
    }),

  getProgress: () =>
    request<ProgressResponse>(`${BASE_URL}/progress`),

  getTasks: (level?: number) =>
    request<ReviewTask[]>(`${BASE_URL}/tasks${level ? `?level=${level}` : ''}`),

  reset: (level?: number) =>
    request<{ message: string }>(`${BASE_URL}/reset`, {
      method: 'POST',
      body: level ? JSON.stringify({ level }) : undefined,
    }),
};
