import React from "react";
import { Task, Routine, TaskCategory } from "../types";
import { 
  Plus, 
  Trash2, 
  Calendar, 
  RotateCw, 
  Check, 
  Award, 
  Flame, 
  CheckSquare, 
  Clock, 
  CircleDot, 
  Tag, 
  Sparkles, 
  Brain, 
  Lightbulb, 
  TrendingUp, 
  CheckCircle2, 
  RefreshCw, 
  X, 
  ArrowRight, 
  Zap, 
  Compass, 
  CheckCircle 
} from "lucide-react";

interface TasksSectionProps {
  tasks: Task[];
  routines: Routine[];
  onSaveTask: (task: Omit<Task, "id" | "createdAt" | "completedDates"> & { id?: string }) => Promise<void>;
  onCheckTask: (id: string, date: string) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onSaveRoutine: (routine: Omit<Routine, "id" | "createdAt"> & { id?: string }) => Promise<void>;
  onDeleteRoutine: (id: string) => Promise<void>;
  darkMode: boolean;
}

export const CATEGORY_COLORS: Record<TaskCategory, { bg: string; text: string; border: string }> = {
  Personal: { bg: "bg-[#0A84FF]/10", text: "text-[#0A84FF]", border: "border-[#0A84FF]/25" },
  Work: { bg: "bg-[#BF5AF2]/10", text: "text-[#BF5AF2]", border: "border-[#BF5AF2]/25" },
  Health: { bg: "bg-[#30D158]/10", text: "text-[#30D158]", border: "border-[#30D158]/25" },
  Mindfulness: { bg: "bg-[#FF9F0A]/10", text: "text-[#FF9F0A]", border: "border-[#FF9F0A]/25" },
  Study: { bg: "bg-[#5E5CE6]/10", text: "text-[#5E5CE6]", border: "border-[#5E5CE6]/25" },
  General: { bg: "bg-stone-500/10", text: "text-stone-400", border: "border-stone-500/20" },
};

export default function TasksSection({
  tasks,
  routines,
  onSaveTask,
  onCheckTask,
  onDeleteTask,
  onSaveRoutine,
  onDeleteRoutine,
  darkMode
}: TasksSectionProps) {
  const [activeSegment, setActiveSegment] = React.useState<'daily' | 'routines'>('daily');
  const [taskTitle, setTaskTitle] = React.useState("");
  const [selectedRoutineId, setSelectedRoutineId] = React.useState<string>("");
  const [taskDueTime, setTaskDueTime] = React.useState("");
  const [taskCategory, setTaskCategory] = React.useState<TaskCategory>("Personal");
  const [filterCategory, setFilterCategory] = React.useState<string>("All");
  
  // Routine configuration state
  const [routineTitle, setRoutineTitle] = React.useState("");
  const [routineFreq, setRoutineFreq] = React.useState<'daily' | 'weekly'>('daily');
  const [routineTime, setRoutineTime] = React.useState("08:00");
  const [showAddSheet, setShowAddSheet] = React.useState(false);

  // AI Pattern Analyzer & Routine Suggestions State
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = React.useState<{
    patternSummary: string;
    insights: string[];
    suggestions: Array<{
      title: string;
      category: TaskCategory;
      frequency: 'daily' | 'weekly';
      time: string;
      reason: string;
    }>;
  } | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = React.useState(false);
  const [adoptedRoutines, setAdoptedRoutines] = React.useState<string[]>([]);
  const [adoptingId, setAdoptingId] = React.useState<string | null>(null);

  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getTodayDateString();

  // Create new task checklist item
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    await onSaveTask({
      title: taskTitle.trim(),
      completed: false,
      dueDate: todayStr,
      dueTime: taskDueTime || undefined,
      category: taskCategory,
      routineId: selectedRoutineId || undefined,
      streak: 0,
    });

    setTaskTitle("");
    setSelectedRoutineId("");
    setTaskDueTime("");
  };

  // Create new repeating routine
  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineTitle.trim()) return;

    await onSaveRoutine({
      title: routineTitle.trim(),
      frequency: routineFreq,
      time: routineTime,
      active: true,
    });

    setRoutineTitle("");
    setRoutineFreq("daily");
    setRoutineTime("08:00");
    setShowAddSheet(false);
  };

  // Math for daily completion metrics
  const dailyProgress = React.useMemo(() => {
    const todayTasks = tasks.filter(t => t.dueDate === todayStr || t.routineId);
    if (todayTasks.length === 0) return 0;
    const completedCount = todayTasks.filter(t => {
      return t.completed || (t.completedDates && t.completedDates.includes(todayStr));
    }).length;
    return Math.round((completedCount / todayTasks.length) * 100);
  }, [tasks, todayStr]);

  // Filtered task list
  const filteredTasks = React.useMemo(() => {
    if (filterCategory === "All") return tasks;
    return tasks.filter((t) => (t.category || "General") === filterCategory);
  }, [tasks, filterCategory]);

  const categories: TaskCategory[] = ["Personal", "Work", "Health", "Mindfulness", "Study", "General"];

  // AI Task Pattern Analysis Handler
  const handleAnalyzePatterns = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setShowAnalysisModal(true);

    try {
      const categoryCounts: Record<string, number> = {};
      let totalCompleted = 0;
      tasks.forEach((t) => {
        const cat = t.category || "General";
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        if (t.completed || (t.completedDates && t.completedDates.includes(todayStr))) {
          totalCompleted += 1;
        }
      });

      const stats = {
        totalTasks: tasks.length,
        completedToday: totalCompleted,
        dailyProgressPercent: dailyProgress,
        categoryDistribution: categoryCounts,
        activeRoutinesCount: routines.length,
      };

      const res = await fetch("/api/suggest-routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, routines, stats }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to analyze completion patterns");
      }

      const data = await res.json();
      setAnalysisResult(data);
    } catch (err: any) {
      console.error("Pattern analysis error:", err);
      setAnalysisError(err.message || "Could not analyze patterns at this time.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Adopt a suggested routine
  const handleAdoptRoutine = async (
    suggestion: { title: string; category: TaskCategory; frequency: 'daily' | 'weekly'; time: string; reason: string }
  ) => {
    setAdoptingId(suggestion.title);
    try {
      // 1. Save to routine templates
      await onSaveRoutine({
        title: suggestion.title,
        frequency: suggestion.frequency,
        time: suggestion.time,
        active: true,
      });

      // 2. Also populate today's checklist item
      await onSaveTask({
        title: suggestion.title,
        completed: false,
        dueDate: todayStr,
        dueTime: suggestion.time || undefined,
        category: suggestion.category,
        streak: 0,
      });

      setAdoptedRoutines((prev) => [...prev, suggestion.title]);
    } catch (err) {
      console.error("Failed to adopt routine:", err);
    } finally {
      setAdoptingId(null);
    }
  };

  // Adopt all suggestions in one batch
  const handleAdoptAll = async () => {
    if (!analysisResult?.suggestions) return;
    for (const sug of analysisResult.suggestions) {
      if (!adoptedRoutines.includes(sug.title)) {
        await handleAdoptRoutine(sug);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Visual Activity/Completion Summary Widget */}
      <div className={`p-6 rounded-3xl border flex items-center justify-between shadow-sm relative overflow-hidden ${
        darkMode ? "bg-[#1C1C1E]/60 border-[#38383A]" : "bg-white border-stone-200"
      }`}>
        <div className="space-y-1.5 z-10">
          <span className="block text-[10px] font-black uppercase tracking-wider text-[#0A84FF]">Wellness Ring</span>
          <h3 className="text-xl font-extrabold tracking-tight">Today's Progress</h3>
          <p className="text-[#8E8E93] text-xs">
            {dailyProgress === 100 ? "Amazing! All routines cleared today. 🎉" : `${dailyProgress}% of active routines completed.`}
          </p>
        </div>

        {/* Circular SVG Ring Widget */}
        <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90">
            {/* Background track ring */}
            <circle
              cx="32"
              cy="32"
              r="26"
              className={darkMode ? "stroke-[#38383A]" : "stroke-stone-100"}
              strokeWidth="5"
              fill="transparent"
            />
            {/* Active progress track ring */}
            <circle
              cx="32"
              cy="32"
              r="26"
              className="stroke-[#0A84FF] transition-all duration-500"
              strokeWidth="5"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 26}
              strokeDashoffset={2 * Math.PI * 26 * (1 - dailyProgress / 100)}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-xs font-extrabold text-[#0A84FF]">{dailyProgress}%</span>
        </div>
      </div>

      {/* AI Habit & Pattern Intelligence Banner */}
      <div className={`p-4 sm:p-5 rounded-3xl border relative overflow-hidden transition-all shadow-sm ${
        darkMode 
          ? "bg-gradient-to-r from-[#1C1C1E] via-[#242426] to-[#1C1C1E] border-[#38383A]" 
          : "bg-gradient-to-r from-white via-stone-50 to-white border-stone-200"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0A84FF] to-[#BF5AF2] text-white flex items-center justify-center shadow-md shadow-[#0A84FF]/20 shrink-0 mt-0.5">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs sm:text-sm font-extrabold tracking-tight">AI Habit & Pattern Intelligence</h4>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-[#BF5AF2]/15 text-[#BF5AF2] uppercase tracking-wider">
                  Gemini 3.7
                </span>
              </div>
              <p className="text-[11px] text-[#8E8E93] mt-0.5 leading-snug">
                Analyze completion patterns, streak velocities, and get personalized daily routines.
              </p>
            </div>
          </div>

          <button
            onClick={handleAnalyzePatterns}
            disabled={isAnalyzing}
            className="px-4 py-2.5 bg-[#0A84FF] hover:bg-[#409CFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-[#0A84FF]/20 transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing Patterns...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Analyze & Suggest Routines</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* iOS Segmented Controls */}
      <div className={`p-1.5 rounded-2xl flex border ${
        darkMode ? "bg-black/40 border-[#38383A]" : "bg-stone-200/50 border-stone-200"
      }`}>
        <button
          onClick={() => setActiveSegment('daily')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSegment === 'daily'
              ? darkMode ? "bg-[#1C1C1E] text-white border border-[#38383A] shadow-sm" : "bg-white text-stone-900 shadow-sm"
              : "text-[#8E8E93] hover:text-white"
          }`}
        >
          Active Checklist
        </button>
        <button
          onClick={() => setActiveSegment('routines')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSegment === 'routines'
              ? darkMode ? "bg-[#1C1C1E] text-white border border-[#38383A] shadow-sm" : "bg-white text-stone-900 shadow-sm"
              : "text-[#8E8E93] hover:text-white"
          }`}
        >
          Routine Templates
        </button>
      </div>

      {/* DAILY CHECKLIST SHEET */}
      {activeSegment === 'daily' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold opacity-60 flex items-center gap-1.5 text-[#0A84FF]">
              <Calendar className="w-4 h-4" />
              Active Daily Tasks ({tasks.length})
            </h4>
          </div>

          {/* Quick inline checklist input */}
          <form onSubmit={handleCreateTask} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <input
              type="text"
              required
              placeholder="Quick Add Checklist Action..."
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className={`flex-1 min-w-[150px] px-4 py-3 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#0A84FF] ${
                darkMode ? "bg-black/40 border-[#38383A] text-white" : "bg-white border-stone-200"
              }`}
            />
            
            <div className="flex gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
              {/* Category Selector */}
              <select
                value={taskCategory}
                onChange={(e: any) => setTaskCategory(e.target.value)}
                className={`flex-1 sm:flex-none px-2.5 py-3 rounded-xl text-[11px] font-semibold border focus:outline-none ${
                  darkMode ? "bg-black/40 border-[#38383A] text-white" : "bg-white border-stone-200 text-stone-700"
                }`}
                title="Task Category"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {routines.length > 0 && (
                <select
                  value={selectedRoutineId}
                  onChange={(e) => setSelectedRoutineId(e.target.value)}
                  className={`flex-1 sm:flex-none px-2.5 py-3 rounded-xl text-[11px] border focus:outline-none max-w-[130px] ${
                    darkMode ? "bg-black/40 border-[#38383A] text-white font-medium" : "bg-white border-stone-200 text-stone-600 font-medium"
                  }`}
                >
                  <option value="">No Routine</option>
                  {routines.map((r) => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
              )}

              <input
                type="time"
                value={taskDueTime}
                onChange={(e) => setTaskDueTime(e.target.value)}
                title="Optional Due Time"
                className={`flex-1 sm:flex-none px-2.5 py-3 rounded-xl text-[11px] border focus:outline-none shrink-0 ${
                  darkMode ? "bg-black/40 border-[#38383A] text-white" : "bg-white border-stone-200 text-stone-600"
                }`}
              />

              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-3 bg-[#0A84FF] hover:bg-[#409CFF] text-white rounded-xl font-bold text-xs shadow-md shadow-[#0A84FF]/10 shrink-0 cursor-pointer"
              >
                Add
              </button>
            </div>
          </form>

          {/* Category Filter Pills */}
          {tasks.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setFilterCategory("All")}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filterCategory === "All"
                    ? "bg-[#0A84FF] text-white shadow-sm shadow-[#0A84FF]/20"
                    : darkMode ? "bg-[#1C1C1E] text-stone-400 border border-[#38383A]" : "bg-white text-stone-600 border border-stone-200"
                }`}
              >
                All ({tasks.length})
              </button>
              {categories.map((cat) => {
                const count = tasks.filter((t) => (t.category || "General") === cat).length;
                if (count === 0 && filterCategory !== cat) return null;
                const styling = CATEGORY_COLORS[cat];
                const isActive = filterCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border flex items-center gap-1 cursor-pointer ${
                      isActive
                        ? `${styling.bg} ${styling.text} ${styling.border} ring-2 ring-offset-1 ring-[#0A84FF]/30`
                        : darkMode 
                          ? "bg-[#1C1C1E] text-stone-400 border-[#38383A] hover:text-white" 
                          : "bg-white text-stone-600 border-stone-200 hover:text-stone-900"
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="text-[9px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Task list */}
          {filteredTasks.length === 0 ? (
            <div className={`p-8 rounded-3xl border border-dashed text-center ${
              darkMode ? "border-[#38383A] bg-[#1C1C1E]/20 text-stone-500" : "border-stone-200 bg-white/50 text-stone-500"
            }`}>
              <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-45 text-[#0A84FF]" />
              <p className="text-xs font-semibold">
                {filterCategory !== "All" ? `No tasks found in "${filterCategory}"` : "Ready for your day!"}
              </p>
              <p className="text-[10px] mt-1 opacity-70">
                {filterCategory !== "All" ? "Switch filters or add new tasks in this category." : "Add custom checklist points or sync routines to populate."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredTasks.map((task) => {
                const isCompletedToday = task.completed || (task.completedDates && task.completedDates.includes(todayStr));
                const cat = task.category || "General";
                const catStyle = CATEGORY_COLORS[cat] || CATEGORY_COLORS.General;
                
                // Get due time: explicit or linked routine
                let timeStr = task.dueTime;
                if (!timeStr && task.routineId) {
                  const routine = routines.find(r => r.id === task.routineId);
                  if (routine && routine.time) {
                    timeStr = routine.time;
                  }
                }

                // Check if approaching
                let timeApproachingMsg = "";
                let isUrgent = false;
                if (timeStr && !isCompletedToday) {
                  const today = new Date();
                  const currentHour = today.getHours();
                  const currentMinute = today.getMinutes();
                  const currentTotalMinutes = currentHour * 60 + currentMinute;

                  const [dueH, dueM] = timeStr.split(":").map(Number);
                  const dueTotalMinutes = dueH * 60 + dueM;
                  const diff = dueTotalMinutes - currentTotalMinutes;

                  if (diff > 0 && diff <= 30) {
                    timeApproachingMsg = `due in ${diff}m`;
                    isUrgent = true;
                  } else if (diff === 0) {
                    timeApproachingMsg = "due now!";
                    isUrgent = true;
                  } else if (diff < 0) {
                    timeApproachingMsg = "overdue";
                    isUrgent = false;
                  }
                }

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                      isCompletedToday
                        ? darkMode ? "bg-[#1C1C1E]/20 border-[#38383A]/30 opacity-60" : "bg-stone-100 border-stone-200 opacity-60"
                        : darkMode ? "bg-[#1C1C1E] border-[#38383A]" : "bg-white border-stone-150"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => onCheckTask(task.id, todayStr)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                          isCompletedToday
                            ? "bg-[#30D158] border-[#30D158] text-white animate-scale-up"
                            : darkMode ? "border-[#38383A] hover:border-[#0A84FF] bg-black/40" : "border-stone-300 hover:border-[#0A84FF] bg-stone-50"
                        }`}
                      >
                        {isCompletedToday && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                      </button>

                      <div className="space-y-0.5 min-w-0">
                        <span className={`text-xs font-semibold block truncate ${isCompletedToday ? "line-through text-stone-500" : ""}`}>
                          {task.title}
                        </span>
                        
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {/* Category Tag Badge */}
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                            {cat}
                          </span>

                          {task.routineId && (
                            <span className="text-[9px] text-[#0A84FF] font-bold uppercase tracking-wider flex items-center gap-1">
                              <RotateCw className="w-2.5 h-2.5" />
                              Routine
                            </span>
                          )}
                          {timeStr && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                              isUrgent 
                                ? "bg-[#FF453A]/10 text-[#FF453A] animate-pulse border border-[#FF453A]/25" 
                                : isCompletedToday 
                                  ? "bg-stone-500/10 text-stone-500"
                                  : timeApproachingMsg === "overdue"
                                    ? "bg-[#FF453A]/5 text-[#FF453A]/60"
                                    : "bg-stone-500/15 text-stone-400"
                            }`}>
                              <Clock className="w-2.5 h-2.5" />
                              {timeStr} {timeApproachingMsg && `(${timeApproachingMsg})`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Streak badge */}
                      {task.streak > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF9F0A]/10 text-[#FF9F0A] text-[10px] font-extrabold border border-[#FF9F0A]/15">
                          <Flame className="w-3.5 h-3.5 fill-[#FF9F0A] text-[#FF9F0A]" />
                          {task.streak}d
                        </span>
                      )}

                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="text-stone-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ROUTINE TEMPLATES SHEET */}
      {activeSegment === 'routines' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold opacity-60 flex items-center gap-1.5 text-[#0A84FF]">
              <RotateCw className="w-4 h-4" />
              My Routine Templates ({routines.length})
            </h4>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAnalyzePatterns}
                disabled={isAnalyzing}
                className="text-xs font-bold text-[#BF5AF2] hover:text-[#DA8FFF] flex items-center gap-1 cursor-pointer"
                title="Analyze patterns and suggest routines"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Suggest
              </button>

              <button
                onClick={() => setShowAddSheet(!showAddSheet)}
                className="text-xs font-bold text-[#0A84FF] hover:text-[#409CFF] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Template
              </button>
            </div>
          </div>

          {/* Quick AI Pattern Suggestions Card in Routines Tab */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            darkMode ? "bg-gradient-to-r from-[#1C1C1E] to-[#2C2C2E]/60 border-[#38383A]" : "bg-gradient-to-r from-[#BF5AF2]/5 to-white border-stone-200"
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#BF5AF2]/15 text-[#BF5AF2] flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold">Discover New Routine Suggestions</h5>
                <p className="text-[10px] text-[#8E8E93]">Gemini AI identifies habits you frequently complete or miss, and proposes structured routines.</p>
              </div>
            </div>

            <button
              onClick={handleAnalyzePatterns}
              disabled={isAnalyzing}
              className="px-3.5 py-1.5 bg-[#BF5AF2] hover:bg-[#BF5AF2]/90 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-[#BF5AF2]/20 cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3" />
              Analyze Patterns
            </button>
          </div>

          {showAddSheet && (
            <form onSubmit={handleCreateRoutine} className={`p-5 rounded-2xl border space-y-4 animate-slide-up ${
              darkMode ? "bg-[#1C1C1E] border-[#38383A]" : "bg-white border-stone-200"
            }`}>
              <h5 className="font-bold text-xs uppercase tracking-wider text-[#0A84FF]">New Routine Template</h5>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diaphragmatic Breath, Morning Pages"
                  value={routineTitle}
                  onChange={(e) => setRoutineTitle(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#0A84FF] ${
                    darkMode ? "bg-black/40 border-[#38383A] text-white" : "bg-stone-50 border-stone-200"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Frequency</label>
                  <select
                    value={routineFreq}
                    onChange={(e: any) => setRoutineFreq(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#0A84FF] ${
                      darkMode ? "bg-black/40 border-[#38383A] text-white" : "bg-stone-50 border-stone-200"
                    }`}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Preferred Time</label>
                  <input
                    type="time"
                    value={routineTime}
                    onChange={(e) => setRoutineTime(e.target.value)}
                    className={`w-full p-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#0A84FF] ${
                      darkMode ? "bg-black/40 border-[#38383A] text-white" : "bg-stone-50 border-stone-200"
                    }`}
                  />
                </div>
              </div>

              <div className="flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddSheet(false)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-semibold opacity-70 hover:opacity-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0A84FF] hover:bg-[#409CFF] text-white rounded-lg text-[10px] font-bold shadow-md shadow-[#0A84FF]/10"
                >
                  Save Template
                </button>
              </div>
            </form>
          )}

          {/* Routine List */}
          {routines.length === 0 ? (
            <div className={`p-8 rounded-3xl border border-dashed text-center ${
              darkMode ? "border-[#38383A] bg-[#1C1C1E]/20 text-stone-500" : "border-stone-200 bg-white/50 text-stone-500"
            }`}>
              <CircleDot className="w-10 h-10 mx-auto mb-2 opacity-45 text-[#0A84FF]" />
              <p className="text-xs font-semibold">No templates yet.</p>
              <p className="text-[10px] mt-1 opacity-70">Creating templates lets you quickly auto-build checklists daily.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {routines.map((routine) => (
                <div
                  key={routine.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    darkMode ? "bg-[#1C1C1E] border-[#38383A]" : "bg-white border-stone-150"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#0A84FF]/10 text-[#0A84FF] flex items-center justify-center">
                      <RotateCw className="w-4 h-4" />
                    </div>

                    <div>
                      <h5 className="text-xs font-bold">{routine.title}</h5>
                      <div className="flex items-center gap-2 mt-0.5 text-[9px] opacity-60">
                        <span className="uppercase font-bold tracking-wide text-[#0A84FF]">{routine.frequency}</span>
                        {routine.time && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {routine.time}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteRoutine(routine.id)}
                    className="text-stone-400 hover:text-rose-500 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI PATTERN ANALYSIS & ROUTINE RECOMMENDATIONS MODAL SHEET */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div 
            className={`w-full max-w-xl max-h-[88vh] rounded-3xl border flex flex-col shadow-2xl overflow-hidden animate-scale-up ${
              darkMode ? "bg-[#1C1C1E] border-[#38383A] text-white" : "bg-white border-stone-200 text-stone-900"
            }`}
          >
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between shrink-0 ${
              darkMode ? "border-[#38383A] bg-[#2C2C2E]/40" : "border-stone-200 bg-stone-50/50"
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0A84FF] to-[#BF5AF2] text-white flex items-center justify-center shadow-md">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight">Productivity Patterns & Daily Routines</h3>
                  <p className="text-[10px] text-[#8E8E93]">Behavioral pattern synthesis by Gemini AI</p>
                </div>
              </div>

              <button
                onClick={() => setShowAnalysisModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-500/20 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {isAnalyzing && (
                <div className="py-12 text-center space-y-4">
                  <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-[#0A84FF]/20 animate-ping" />
                    <div className="w-12 h-12 rounded-full bg-[#0A84FF]/30 flex items-center justify-center text-[#0A84FF]">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold">Analyzing Task Completion Patterns</h4>
                    <p className="text-xs text-[#8E8E93] max-w-xs mx-auto">
                      Evaluating categories, streak velocities, timing distributions, and balance...
                    </p>
                  </div>
                </div>
              )}

              {analysisError && !isAnalyzing && (
                <div className="p-4 rounded-2xl bg-[#FF453A]/10 border border-[#FF453A]/20 text-[#FF453A] space-y-2 text-center">
                  <p className="text-xs font-semibold">{analysisError}</p>
                  <button
                    onClick={handleAnalyzePatterns}
                    className="px-3 py-1.5 bg-[#FF453A] text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Retry Analysis
                  </button>
                </div>
              )}

              {analysisResult && !isAnalyzing && (
                <div className="space-y-5">
                  {/* Pattern Summary Highlight */}
                  <div className={`p-4 rounded-2xl border ${
                    darkMode ? "bg-black/30 border-[#38383A]" : "bg-stone-50 border-stone-200"
                  }`}>
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#0A84FF] mb-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Behavioral Pattern Synthesis</span>
                    </div>
                    <p className="text-xs font-medium leading-relaxed">
                      "{analysisResult.patternSummary}"
                    </p>
                  </div>

                  {/* Insights Section */}
                  {analysisResult.insights && analysisResult.insights.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-[#8E8E93] flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3 text-[#30D158]" />
                        Key Habit Observations ({analysisResult.insights.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {analysisResult.insights.map((insight, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border text-[11px] font-medium flex items-start gap-2 ${
                              darkMode ? "bg-[#2C2C2E]/40 border-[#38383A]" : "bg-white border-stone-200"
                            }`}
                          >
                            <Lightbulb className="w-3.5 h-3.5 text-[#FF9F0A] shrink-0 mt-0.5" />
                            <span className="leading-snug">{insight}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Routine Suggestions Section */}
                  {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-[#8E8E93] flex items-center gap-1.5">
                          <Zap className="w-3 h-3 text-[#BF5AF2]" />
                          Recommended Daily Routines ({analysisResult.suggestions.length})
                        </h4>
                        <button
                          onClick={handleAdoptAll}
                          className="text-[11px] font-bold text-[#0A84FF] hover:underline cursor-pointer"
                        >
                          Adopt All Routines
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {analysisResult.suggestions.map((sug, idx) => {
                          const cat = sug.category || "General";
                          const catStyle = CATEGORY_COLORS[cat] || CATEGORY_COLORS.General;
                          const isAdopted = adoptedRoutines.includes(sug.title);
                          const isAdoptingThis = adoptingId === sug.title;

                          return (
                            <div
                              key={idx}
                              className={`p-4 rounded-2xl border transition-all ${
                                isAdopted
                                  ? darkMode ? "bg-[#30D158]/5 border-[#30D158]/30" : "bg-[#30D158]/10 border-[#30D158]/30"
                                  : darkMode ? "bg-[#2C2C2E]/50 border-[#38383A]" : "bg-white border-stone-200"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                                      {cat}
                                    </span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#0A84FF]/10 text-[#0A84FF] uppercase tracking-wider">
                                      {sug.frequency}
                                    </span>
                                    {sug.time && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-stone-500/10 text-stone-400 flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5" />
                                        {sug.time}
                                      </span>
                                    )}
                                  </div>
                                  <h5 className="text-xs font-bold">{sug.title}</h5>
                                  <p className="text-[11px] text-[#8E8E93] italic">
                                    "{sug.reason}"
                                  </p>
                                </div>

                                <button
                                  onClick={() => handleAdoptRoutine(sug)}
                                  disabled={isAdopted || isAdoptingThis}
                                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                                    isAdopted
                                      ? "bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30 cursor-default"
                                      : "bg-[#0A84FF] hover:bg-[#409CFF] text-white shadow-sm shadow-[#0A84FF]/20"
                                  }`}
                                >
                                  {isAdopted ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[3px]" />
                                      <span>Adopted ✓</span>
                                    </>
                                  ) : isAdoptingThis ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>Adopting...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>+ Adopt Routine</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t flex justify-between items-center shrink-0 ${
              darkMode ? "border-[#38383A] bg-black/20" : "border-stone-200 bg-stone-50"
            }`}>
              <button
                onClick={handleAnalyzePatterns}
                disabled={isAnalyzing}
                className="text-xs font-bold text-[#0A84FF] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                Re-Analyze Patterns
              </button>

              <button
                onClick={() => setShowAnalysisModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-500/20 hover:bg-stone-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
