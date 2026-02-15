import { useState, useRef, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { timeBlockAPI } from '../services/api';
import type { TimeBlock, Task, TimeBlockCreate } from '../services/api';
// Constants
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);
const HOUR_HEIGHT = 80;
const SNAP_INTERVAL = 15;

const PRESET_COLORS = [
  { name: 'Blue', value: 'bg-blue-500' },
  { name: 'Purple', value: 'bg-purple-500' },
  { name: 'Green', value: 'bg-green-500' },
  { name: 'Yellow', value: 'bg-yellow-500' },
  { name: 'Orange', value: 'bg-orange-500' },
  { name: 'Pink', value: 'bg-pink-500' },
  { name: 'Indigo', value: 'bg-indigo-500' },
  { name: 'Red', value: 'bg-red-500' },
  { name: 'Cyan', value: 'bg-cyan-500' },
  { name: 'Teal', value: 'bg-teal-500' },
];

// Helper functions
const snapToInterval = (time: number, interval: number): number => {
  const minutes = (time % 1) * 60;
  const snappedMinutes = Math.round(minutes / interval) * interval;
  return Math.floor(time) + snappedMinutes / 60;
};

const formatTime = (hour: number): string => {
  const h = Math.floor(hour);
  const m = Math.round((hour % 1) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

let taskIdCounter = 0;
const generateTaskId = () => {
  taskIdCounter += 1;
  return `task-${Date.now()}-${taskIdCounter}`;
};

// Animation Components (keeping your existing animations)
function DoneCheckAnimation({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 1200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-green-400/5 to-green-500/10 animate-done-bg-fade" />
      <div className="relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 bg-gradient-to-r from-green-500/30 to-green-400/20 rounded-full blur-3xl animate-done-glow" />
        </div>
        <svg width="160" height="160" viewBox="0 0 160 160" className="relative z-10 animate-done-scale">
          <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-500/20" opacity="0.3" />
          <path d="M 45 80 L 70 105 L 115 55" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 animate-done-check-draw" style={{ strokeDasharray: 120, strokeDashoffset: 120, filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.4))' }} />
        </svg>
      </div>
    </div>
  );
}

function PerfectDayCheckAnimation({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const audio = new Audio('/sounds/success.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
    const timer = setTimeout(() => onComplete(), 2000);
    return () => {
      clearTimeout(timer);
      audio.pause();
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/15 via-green-400/10 to-green-500/15 animate-perfect-bg-fade" />
      <div className="relative flex flex-col items-center gap-8">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-96 h-96 bg-gradient-to-r from-green-400/40 via-green-300/30 to-green-400/40 rounded-full blur-3xl animate-perfect-glow" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-80 h-80 border-4 border-green-400/30 rounded-full animate-perfect-ring-expand" />
        </div>
        <svg width="200" height="200" viewBox="0 0 200 200" className="relative z-10 animate-perfect-check-scale">
          <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500/30 animate-perfect-ring" style={{ strokeDasharray: '565', strokeDashoffset: '565' }} />
          <path d="M 55 100 L 85 130 L 145 65" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 animate-perfect-check-draw" style={{ strokeDasharray: 150, strokeDashoffset: 150, filter: 'drop-shadow(0 0 12px rgba(34, 197, 94, 0.6))' }} />
        </svg>
        <div className="relative z-10 animate-perfect-text-appear">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-green-600 mb-2">Perfect Day!</h2>
            <p className="text-base text-text-muted font-medium">All tasks completed</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function TimeBlocking() {
  useAuth();
  
  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [xp, setXp] = useState(0);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [showDoneCheck, setShowDoneCheck] = useState(false);
  const [showPerfectDay, setShowPerfectDay] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{ startHour: number; endHour: number } | null>(null);
  
  // Form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState('30');
  const [newTaskColor, setNewTaskColor] = useState(PRESET_COLORS[0].value);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editColor, setEditColor] = useState('');
  
  const scheduleContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollIntervalRef = useRef<number | null>(null);

  // Computed values
  const totalBlocks = timeBlocks.length;
  const completedBlocks = timeBlocks.filter(b => b.completed).length;
  const progressPercentage = totalBlocks > 0 ? (completedBlocks / totalBlocks) * 100 : 0;
  const isPerfectDay = totalBlocks > 0 && completedBlocks === totalBlocks;
  const scheduleHeight = Math.min(400 + (timeBlocks.length * 60), 900);

  // ============================================
  // API CALLS - All backend communication here
  // ============================================
  
  const fetchTimeBlocks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch from Laravel backend
      const blocks = await timeBlockAPI.getAll();
      setTimeBlocks(blocks);
      
      // Calculate XP
      const stats = await timeBlockAPI.getStatistics();
      setXp(stats.xp);
    } catch (err) {
      const error = err as Error;
      console.error('Error fetching time blocks:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createTimeBlock = async (data: TimeBlockCreate) => {
    try {
      setError(null);
      const newBlock = await timeBlockAPI.create(data);
      setTimeBlocks(prev => [...prev, newBlock]);
      return newBlock;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    }
  };

  const completeTimeBlock = async (id: string) => {
    try {
      setError(null);
      const updatedBlock = await timeBlockAPI.markComplete(id);
      
      setTimeBlocks(prev =>
        prev.map(block => block.id === id ? updatedBlock : block)
      );
      
      setXp(prev => prev + 50);
      
      // Check for perfect day
      const newCompletedCount = timeBlocks.filter(b => b.id === id || b.completed).length;
      const willBePerfect = totalBlocks > 0 && newCompletedCount === totalBlocks;
      
      if (willBePerfect) {
        setShowPerfectDay(true);
      } else {
        setShowDoneCheck(true);
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    }
  };

  const deleteTimeBlock = async (id: string) => {
    const block = timeBlocks.find(b => b.id === id);
    if (!block) return;

    try {
      setError(null);
      await timeBlockAPI.delete(id);
      
      setTimeBlocks(prev => prev.filter(b => b.id !== id));
      setTasks(prev => [...prev, block.task]);
      
      if (block.completed) {
        setXp(prev => Math.max(0, prev - 50));
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    }
  };

  // ============================================
  // EFFECTS
  // ============================================
  
  useEffect(() => {
    fetchTimeBlocks();
  }, []);

  useEffect(() => {
    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, []);

  // ============================================
  // HANDLERS
  // ============================================
  
  const hasConflict = (startHour: number, endHour: number, excludeId?: string): boolean => {
    return timeBlocks.some(block => {
      if (excludeId && block.id === excludeId) return false;
      return startHour < block.endHour && endHour > block.startHour;
    });
  };

  const calculateDropPosition = (clientY: number, task: Task): { startHour: number; endHour: number } | null => {
    if (!scheduleContainerRef.current) return null;

    const container = scheduleContainerRef.current;
    const rect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop;
    const relativeY = clientY - rect.top + scrollTop;
    const hourDecimal = 8 + (relativeY / HOUR_HEIGHT);
    const snappedStart = snapToInterval(hourDecimal, SNAP_INTERVAL);
    const duration = task.duration / 60;
    const snappedEnd = snappedStart + duration;

    if (snappedStart < 8 || snappedEnd > 21) return null;
    return { startHour: snappedStart, endHour: snappedEnd };
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTaskTitle.trim()) {
      alert('Please enter a task title');
      return;
    }

    const duration = parseInt(newTaskDuration);
    if (isNaN(duration) || duration <= 0) {
      alert('Please enter a valid duration');
      return;
    }

    const newTask: Task = {
      id: generateTaskId(),
      title: newTaskTitle.trim(),
      duration,
      color: newTaskColor,
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setNewTaskDuration('30');
    setNewTaskColor(PRESET_COLORS[0].value);
  };

  const addTimeBlock = async (task: Task, startHour: number, endHour: number) => {
    if (endHour > 21) {
      alert('This task would extend beyond 9 PM.');
      return;
    }

    if (hasConflict(startHour, endHour)) {
      alert('Time conflict detected!');
      return;
    }

    try {
      await createTimeBlock({
        task: {
          title: task.title,
          duration: task.duration,
          color: task.color,
        },
        startHour,
        endHour,
      });
      
      setTasks(tasks.filter(t => t.id !== task.id));
    } catch (error) {
      console.error('Failed to add time block:', error);
    }
  };

  const handleDragStart = (task: Task) => setDraggedTask(task);
  
  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragPreview(null);
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  };

  const handleDragOverSchedule = (e: React.DragEvent) => {
    e.preventDefault();
    if (!scheduleContainerRef.current || !draggedTask) return;

    const dropPosition = calculateDropPosition(e.clientY, draggedTask);
    if (dropPosition && !hasConflict(dropPosition.startHour, dropPosition.endHour)) {
      setDragPreview(dropPosition);
    } else {
      setDragPreview(null);
    }

    // Auto-scroll logic (keeping existing implementation)
    const container = scheduleContainerRef.current;
    const rect = container.getBoundingClientRect();
    const scrollThreshold = 100;
    const scrollSpeed = 8;
    const distanceFromBottom = rect.bottom - e.clientY;
    const distanceFromTop = e.clientY - rect.top;

    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }

    if (distanceFromBottom < scrollThreshold && distanceFromBottom > 0) {
      autoScrollIntervalRef.current = window.setInterval(() => {
        const maxScroll = container.scrollHeight - container.clientHeight;
        if (container.scrollTop < maxScroll) {
          container.scrollTop += scrollSpeed;
        } else if (autoScrollIntervalRef.current) {
          clearInterval(autoScrollIntervalRef.current);
          autoScrollIntervalRef.current = null;
        }
      }, 16);
    } else if (distanceFromTop < scrollThreshold && distanceFromTop > 0) {
      autoScrollIntervalRef.current = window.setInterval(() => {
        if (container.scrollTop > 0) {
          container.scrollTop -= scrollSpeed;
        } else if (autoScrollIntervalRef.current) {
          clearInterval(autoScrollIntervalRef.current);
          autoScrollIntervalRef.current = null;
        }
      }, 16);
    }
  };

  const handleDragLeaveSchedule = () => {
    setDragPreview(null);
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  };

  const handleDropOnSchedule = (e: React.DragEvent) => {
    e.preventDefault();
    setDragPreview(null);
    
    if (!draggedTask) return;
    
    const dropPosition = calculateDropPosition(e.clientY, draggedTask);
    if (dropPosition) {
      addTimeBlock(draggedTask, dropPosition.startHour, dropPosition.endHour);
    }
    
    setDraggedTask(null);
  };

  // Task editing handlers
  const startEditingTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDuration(task.duration.toString());
    setEditColor(task.color);
  };

  const cancelEditingTask = () => {
    setEditingTaskId(null);
    setEditTitle('');
    setEditDuration('');
    setEditColor('');
  };

  const saveEditedTask = () => {
    if (!editTitle.trim() || !editDuration) {
      alert('Please fill in all fields');
      return;
    }

    const duration = parseInt(editDuration);
    if (isNaN(duration) || duration <= 0) {
      alert('Please enter a valid duration');
      return;
    }

    setTasks(tasks.map(task =>
      task.id === editingTaskId
        ? { ...task, title: editTitle.trim(), duration, color: editColor }
        : task
    ));

    cancelEditingTask();
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-text-muted">Loading time blocks...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Animations */}
        {showDoneCheck && <DoneCheckAnimation onComplete={() => setShowDoneCheck(false)} />}
        {showPerfectDay && <PerfectDayCheckAnimation onComplete={() => setShowPerfectDay(false)} />}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-500">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text">Time Blocking</h1>
            <p className="text-text-muted mt-1">Plan your perfect day</p>
          </div>

          <div className="flex items-center gap-4">
            {isPerfectDay && (
              <div className="px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-button">
                <span className="text-sm font-semibold text-green-600">Perfect Day!</span>
              </div>
            )}
            <div className="flex items-center gap-3 px-4 py-3 bg-background-card rounded-card border border-primary/30">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg">⭐</span>
              </div>
              <div>
                <p className="text-xs text-text-muted">Total XP</p>
                <p className="text-xl font-bold text-primary">{xp}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        {totalBlocks > 0 && (
          <div className="bg-background-card rounded-card border border-border-light p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-text">Today's Progress</h2>
              <span className="text-sm text-text-muted">
                {completedBlocks} / {totalBlocks} blocks completed
              </span>
            </div>
            <div className="h-3 bg-background-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border-light">
              <div className="text-center">
                <p className="text-2xl font-bold text-text">{completedBlocks}</p>
                <p className="text-xs text-text-muted mt-1">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-text">{totalBlocks - completedBlocks}</p>
                <p className="text-xs text-text-muted mt-1">Remaining</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{Math.round(progressPercentage)}%</p>
                <p className="text-xs text-text-muted mt-1">Progress</p>
              </div>
            </div>
          </div>
        )}

        {/* Create Task Form */}
        <div className="bg-background-card rounded-card border border-border-light p-6">
          <h2 className="text-lg font-semibold text-text mb-4">Create New Task</h2>
          <form onSubmit={handleCreateTask}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5">
                <label className="block text-xs text-text-muted mb-1.5">Task Title</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g., Deep Work Session"
                  className="w-full px-3 py-2 bg-background-secondary border border-border rounded-button text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs text-text-muted mb-1.5">Duration (min)</label>
                <input
                  type="number"
                  value={newTaskDuration}
                  onChange={(e) => setNewTaskDuration(e.target.value)}
                  min="1"
                  placeholder="30"
                  className="w-full px-3 py-2 bg-background-secondary border border-border rounded-button text-sm text-text focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs text-text-muted mb-1.5">Color</label>
                <div className="flex gap-1.5">
                  {PRESET_COLORS.slice(0, 6).map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNewTaskColor(color.value)}
                      className={`flex-1 h-9 ${color.value} rounded-button transition-all ${
                        newTaskColor === color.value
                          ? 'ring-2 ring-offset-2 ring-primary ring-offset-background-card scale-110'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 flex items-end">
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-button text-sm font-medium transition-colors"
                >
                  + Add Task
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Main Content: Task Pool & Schedule Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Task Pool */}
          <div className="lg:col-span-1">
            <div className="bg-background-card rounded-card border border-border-light p-5">
              <h2 className="text-lg font-semibold text-text mb-4">
                Task Pool ({tasks.length})
              </h2>

              <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-text-muted">
                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <p className="text-sm">No tasks yet</p>
                    <p className="text-xs mt-1">Create your first task above</p>
                  </div>
                ) : (
                  tasks.map(task => (
                    editingTaskId === task.id ? (
                      <EditTaskCard
                        key={task.id}
                        title={editTitle}
                        duration={editDuration}
                        color={editColor}
                        onTitleChange={setEditTitle}
                        onDurationChange={setEditDuration}
                        onColorChange={setEditColor}
                        onSave={saveEditedTask}
                        onCancel={cancelEditingTask}
                      />
                    ) : (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onEdit={() => startEditingTask(task)}
                        onDelete={() => handleDeleteTask(task.id)}
                      />
                    )
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Time Grid */}
          <div className="lg:col-span-3">
            <div className="bg-background-card rounded-card border border-border-light p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text">Schedule</h2>
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Drag tasks anywhere on the schedule (snaps to {SNAP_INTERVAL} min)</span>
                </div>
              </div>

              {timeBlocks.length === 0 && tasks.length === 0 && (
                <div className="text-center py-16 text-text-muted">
                  <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-base mb-1">Your schedule is empty</p>
                  <p className="text-sm">Create tasks and drag them here to plan your day</p>
                </div>
              )}

              <div
                ref={scheduleContainerRef}
                className="relative overflow-y-auto"
                style={{ maxHeight: `${scheduleHeight}px` }}
                onDragOver={handleDragOverSchedule}
                onDragLeave={handleDragLeaveSchedule}
                onDrop={handleDropOnSchedule}
              >
                {/* Hour grid lines */}
                {HOURS.map((hour, index) => (
                  <HourSlot
                    key={hour}
                    hour={hour}
                    isLast={index === HOURS.length - 1}
                  />
                ))}

                {/* Drag preview */}
                {dragPreview && draggedTask && (
                  <div
                    className={`absolute left-20 right-0 ${draggedTask.color} bg-opacity-40 rounded-button border-2 border-dashed border-current pointer-events-none`}
                    style={{
                      top: `${(dragPreview.startHour - 8) * HOUR_HEIGHT}px`,
                      height: `${(dragPreview.endHour - dragPreview.startHour) * HOUR_HEIGHT - 4}px`,
                      minHeight: '36px',
                    }}
                  >
                    <div className="h-full p-2 flex flex-col text-white opacity-70">
                      <p className="text-xs font-semibold truncate">{draggedTask.title}</p>
                      <p className="text-xs mt-1">{formatTime(dragPreview.startHour)} - {formatTime(dragPreview.endHour)}</p>
                    </div>
                  </div>
                )}

                {/* Actual time blocks */}
                {timeBlocks.map(block => (
                  <TimeBlockComponent
                    key={block.id}
                    block={block}
                    onComplete={completeTimeBlock}
                    onDelete={deleteTimeBlock}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-background-card rounded-card border border-border-light p-6">
          <h3 className="text-lg font-semibold text-text mb-3">💡 Time Blocking Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex gap-3">
              <span className="text-primary shrink-0">•</span>
              <p className="text-text-muted">Schedule your most important work during your peak energy hours</p>
            </div>
            <div className="flex gap-3">
              <span className="text-primary shrink-0">•</span>
              <p className="text-text-muted">Include buffer time between blocks for transitions and breaks</p>
            </div>
            <div className="flex gap-3">
              <span className="text-primary shrink-0">•</span>
              <p className="text-text-muted">Batch similar tasks together to minimize context switching</p>
            </div>
          </div>
        </div>
      </div>

      {/* Animation CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes done-bg-fade { 0% { opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes done-glow { 0% { transform: scale(0.5); opacity: 0; } 40% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.2); opacity: 0; } }
        @keyframes done-check-draw { 0% { stroke-dashoffset: 120; opacity: 0; } 20% { opacity: 1; } 60% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 0; opacity: 0; } }
        @keyframes done-scale { 0% { transform: scale(0.8); opacity: 0; } 40% { transform: scale(1.05); opacity: 1; } 60% { transform: scale(1); } 100% { transform: scale(1); opacity: 0; } }
        @keyframes perfect-bg-fade { 0% { opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes perfect-glow { 0% { transform: scale(0.5); opacity: 0; } 40% { transform: scale(1.1); opacity: 0.7; } 100% { transform: scale(1.4); opacity: 0; } }
        @keyframes perfect-ring-expand { 0% { transform: scale(0.6); opacity: 0; } 40% { opacity: 0.5; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes perfect-ring { 0% { stroke-dashoffset: 565; opacity: 0; } 30% { opacity: 0.6; } 60% { stroke-dashoffset: 0; opacity: 0.8; } 100% { stroke-dashoffset: 0; opacity: 0; } }
        @keyframes perfect-check-draw { 0% { stroke-dashoffset: 150; opacity: 0; } 15% { opacity: 1; } 50% { stroke-dashoffset: 0; } 85% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes perfect-check-scale { 0% { transform: scale(0.7); opacity: 0; } 30% { transform: scale(1.08); opacity: 1; } 50% { transform: scale(1); } 85% { opacity: 1; } 100% { transform: scale(0.95); opacity: 0; } }
        @keyframes perfect-text-appear { 0% { transform: translateY(20px); opacity: 0; } 40% { transform: translateY(0); opacity: 1; } 85% { opacity: 1; } 100% { transform: translateY(-10px); opacity: 0; } }
        .animate-done-bg-fade { animation: done-bg-fade 1.2s ease-out forwards; }
        .animate-done-glow { animation: done-glow 1.2s ease-out forwards; }
        .animate-done-check-draw { animation: done-check-draw 1.2s ease-out forwards; }
        .animate-done-scale { animation: done-scale 1.2s ease-out forwards; }
        .animate-perfect-bg-fade { animation: perfect-bg-fade 2s ease-out forwards; }
        .animate-perfect-glow { animation: perfect-glow 2s ease-out forwards; }
        .animate-perfect-ring-expand { animation: perfect-ring-expand 2s ease-out forwards; }
        .animate-perfect-ring { animation: perfect-ring 2s ease-out forwards; }
        .animate-perfect-check-draw { animation: perfect-check-draw 2s ease-out forwards; }
        .animate-perfect-check-scale { animation: perfect-check-scale 2s ease-out forwards; }
        .animate-perfect-text-appear { animation: perfect-text-appear 2s ease-out forwards; }
      `}} />
    </Layout>
  );
}

// Child Components (keeping your existing implementations)
function TaskCard({ task, onDragStart, onDragEnd, onEdit, onDelete }: {
  task: Task;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        setIsDragging(true);
        onDragStart(task);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={() => {
        setIsDragging(false);
        onDragEnd();
      }}
      className={`${task.color} bg-opacity-10 border-2 border-current rounded-button p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text break-words">{task.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <svg className="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-text-muted">{task.duration} min</span>
          </div>
        </div>
        <div className={`w-8 h-8 ${task.color} rounded-full opacity-30 shrink-0`} />
      </div>

      <div className="flex items-center gap-1.5 pt-2 border-t border-current border-opacity-20">
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex-1 px-2 py-1 bg-background-secondary hover:bg-background-secondary/70 rounded text-xs text-text-muted hover:text-text transition-colors">
          Edit
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex-1 px-2 py-1 bg-background-secondary hover:bg-red-500/10 rounded text-xs text-text-muted hover:text-red-500 transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}

function EditTaskCard({ title, duration, color, onTitleChange, onDurationChange, onColorChange, onSave, onCancel }: {
  title: string;
  duration: string;
  color: string;
  onTitleChange: (value: string) => void;
  onDurationChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="bg-background-secondary rounded-button p-3 border-2 border-primary">
      <div className="space-y-2">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Task title"
          className="w-full px-2 py-1 bg-background-card border border-border rounded text-sm text-text focus:outline-none focus:border-primary"
        />
        <input
          type="number"
          value={duration}
          onChange={(e) => onDurationChange(e.target.value)}
          min="1"
          placeholder="Duration (min)"
          className="w-full px-2 py-1 bg-background-card border border-border rounded text-sm text-text focus:outline-none focus:border-primary"
        />
        <div className="grid grid-cols-5 gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => onColorChange(c.value)}
              className={`h-6 ${c.value} rounded transition-all ${color === c.value ? 'ring-2 ring-primary' : 'opacity-60 hover:opacity-100'}`}
            />
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onSave} className="flex-1 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded text-xs font-medium transition-colors">
            Save
          </button>
          <button onClick={onCancel} className="flex-1 px-3 py-1.5 bg-background-card hover:bg-background-card/70 text-text-muted rounded text-xs transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function HourSlot({ hour, isLast }: { hour: number; isLast: boolean }) {
  return (
    <div className={`relative border-b border-border-light ${isLast ? 'border-b-0' : ''}`} style={{ height: `${HOUR_HEIGHT}px` }}>
      <div className="absolute left-0 top-0 w-16 text-xs text-text-muted font-medium">
        {hour.toString().padStart(2, '0')}:00
      </div>
      <div className="absolute left-16 top-1/4 right-0 h-px bg-border-light/30" />
      <div className="absolute left-16 top-1/2 right-0 h-px bg-border-light/50" />
      <div className="absolute left-16 top-3/4 right-0 h-px bg-border-light/30" />
    </div>
  );
}

function TimeBlockComponent({ block, onComplete, onDelete }: {
  block: TimeBlock;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const duration = block.endHour - block.startHour;
  const topPosition = (block.startHour - 8) * HOUR_HEIGHT;
  const height = duration * HOUR_HEIGHT;

  return (
    <div
      className={`absolute left-20 right-0 ${block.task.color} bg-opacity-90 rounded-button shadow-md border-2 border-white/20 overflow-hidden transition-all ${block.completed ? 'opacity-60' : 'hover:shadow-lg'}`}
      style={{ top: `${topPosition}px`, height: `${Math.max(height - 4, 36)}px`, minHeight: '36px' }}
    >
      <div className="h-full p-2 flex flex-col text-white">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className={`text-xs font-semibold truncate flex-1 ${block.completed ? 'line-through' : ''}`}>
            {block.task.title}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {!block.completed ? (
              <button onClick={() => onComplete(block.id)} className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors">
                ✓
              </button>
            ) : (
              <div className="px-2 py-0.5 bg-white/30 rounded text-xs font-medium">✓</div>
            )}
            <button onClick={() => onDelete(block.id)} className="w-5 h-5 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded transition-colors" title="Remove">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        {height >= 60 && (
          <div className="text-xs opacity-75 space-y-0.5">
            <p>{formatTime(block.startHour)} - {formatTime(block.endHour)}</p>
            <p>{block.task.duration} min</p>
          </div>
        )}
      </div>
    </div>
  );
}
