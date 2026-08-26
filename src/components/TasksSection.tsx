import React from "react";
import { Task, Routine } from "../types";
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
  CircleDot
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
  
  // Routine configuration state
  const [routineTitle, setRoutineTitle] = React.useState("");
  const [routineFreq, setRoutineFreq] = React.useState<'daily' | 'weekly'>('daily');
  const [routineTime, setRoutineTime] = React.useState("08:00");
  const [showAddSheet, setShowAddSheet] = React.useState(false);

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
      // Checked if completed or has todayStr in completedDates log
      return t.completed || (t.completedDates && t.completedDates.includes(todayStr));
    }).length;
    return Math.round((completedCount / todayTasks.length) * 100);
  }, [tasks, todayStr]);

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
          <form onSubmit={handleCreateTask} className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
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
            
            <div className="flex gap-1.5 shrink-0 w-full sm:w-auto">
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
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-3 bg-[#0A84FF] hover:bg-[#409CFF] text-white rounded-xl font-bold text-xs shadow-md shadow-[#0A84FF]/10 shrink-0 cursor-pointer"
            >
              Add
            </button>
          </form>

          {/* Task list */}
          {tasks.length === 0 ? (
            <div className={`p-8 rounded-3xl border border-dashed text-center ${
              darkMode ? "border-[#38383A] bg-[#1C1C1E]/20 text-stone-500" : "border-stone-200 bg-white/50 text-stone-500"
            }`}>
              <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-45 text-[#0A84FF]" />
              <p className="text-xs font-semibold">Ready for your day!</p>
              <p className="text-[10px] mt-1 opacity-70">Add custom checklist points or sync routines to populate.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {tasks.map((task) => {
                const isCompletedToday = task.completed || (task.completedDates && task.completedDates.includes(todayStr));
                
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
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onCheckTask(task.id, todayStr)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          isCompletedToday
                            ? "bg-[#30D158] border-[#30D158] text-white animate-scale-up"
                            : darkMode ? "border-[#38383A] hover:border-[#0A84FF] bg-black/40" : "border-stone-300 hover:border-[#0A84FF] bg-stone-50"
                        }`}
                      >
                        {isCompletedToday && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                      </button>

                      <div className="space-y-0.5">
                        <span className={`text-xs font-semibold ${isCompletedToday ? "line-through text-stone-500" : ""}`}>
                          {task.title}
                        </span>
                        
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
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

                    <div className="flex items-center gap-3">
                      {/* Streak badge */}
                      {task.streak > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF9F0A]/10 text-[#FF9F0A] text-[10px] font-extrabold border border-[#FF9F0A]/15">
                          <Flame className="w-3.5 h-3.5 fill-[#FF9F0A] text-[#FF9F0A]" />
                          {task.streak}d
                        </span>
                      )}

                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="text-stone-400 hover:text-rose-500 transition-colors p-1"
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

            <button
              onClick={() => setShowAddSheet(!showAddSheet)}
              className="text-xs font-bold text-[#0A84FF] hover:text-[#409CFF] flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Template
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
    </div>
  );
}
