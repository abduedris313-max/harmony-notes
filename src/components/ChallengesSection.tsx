import React from "react";
import { Challenge } from "../types";
import { 
  Sparkles, 
  Trash2, 
  Calendar, 
  Compass, 
  Flame, 
  Check, 
  Award, 
  Plus, 
  X,
  Target,
  Clock
} from "lucide-react";
import confetti from "canvas-confetti";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from "recharts";

interface ChallengesSectionProps {
  challenges: Challenge[];
  onSaveChallenge: (challenge: Omit<Challenge, "id" | "createdAt" | "progress"> & { id?: string }) => Promise<void>;
  onCheckInChallenge: (id: string, date: string) => Promise<void>;
  onDeleteChallenge: (id: string) => Promise<void>;
  darkMode: boolean;
}

export default function ChallengesSection({
  challenges,
  onSaveChallenge,
  onCheckInChallenge,
  onDeleteChallenge,
  darkMode
}: ChallengesSectionProps) {
  const [showBrainstorm, setShowBrainstorm] = React.useState(false);
  
  // Custom manual challenge state
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<'health' | 'learning' | 'mindfulness' | 'productivity'>('mindfulness');
  const [duration, setDuration] = React.useState(30);

  // AI brainstormer state
  const [aiGoals, setAiGoals] = React.useState("");
  const [aiCategory, setAiCategory] = React.useState<'health' | 'learning' | 'mindfulness' | 'productivity'>('mindfulness');
  const [aiDuration, setAiDuration] = React.useState(30);
  const [isBrainstorming, setIsBrainstorming] = React.useState(false);

  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getTodayDateString();

  const getPastNDays = (n: number) => {
    const dates: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    return dates;
  };

  const colors = ["#0A84FF", "#30D158", "#FF9F0A", "#BF5AF2", "#FF375F", "#FF453A", "#64D2FF"];

  const chartData = React.useMemo(() => {
    const last7Days = getPastNDays(7);
    return last7Days.map((dateStr) => {
      const dateObj = new Date(dateStr);
      const label = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      
      const row: any = { name: label };
      
      challenges.forEach((ch) => {
        const checkinsBeforeOrOnDate = (ch.progress || []).filter((pDate) => pDate <= dateStr).length;
        const progressPercent = Math.min(100, Math.round((checkinsBeforeOrOnDate / ch.durationDays) * 100));
        row[ch.title] = progressPercent;
      });
      
      return row;
    });
  }, [challenges]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await onSaveChallenge({
      title: title.trim(),
      description: description.trim(),
      startDate: todayStr,
      durationDays: duration,
      active: true,
      category,
    });

    // Reset
    setTitle("");
    setDescription("");
    setCategory("mindfulness");
    setDuration(30);
    setShowBrainstorm(false);

    // Burst confetti!
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 }
    });
  };

  const handleAIBrainstorm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBrainstorming(true);
    try {
      const response = await fetch("/api/suggest-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: aiCategory,
          currentGoals: aiGoals,
          durationDays: aiDuration
        })
      });

      const suggested = await response.json();
      if (suggested.title) {
        // Automatically save suggested challenge!
        await onSaveChallenge({
          title: suggested.title,
          description: `${suggested.description}. Tip: ${suggested.coachingTip || ""}`,
          startDate: todayStr,
          durationDays: suggested.durationDays || aiDuration,
          active: true,
          category: aiCategory,
        });

        // Reset and notify
        setAiGoals("");
        setShowBrainstorm(false);

        // Celebrating AI creation
        confetti({
          particleCount: 120,
          spread: 80,
          colors: ['#f59e0b', '#10b981', '#3b82f6'],
          origin: { y: 0.7 }
        });

        alert(`AI Coach created challenge: "${suggested.title}"! Get started now.`);
      }
    } catch (e) {
      alert("Failed to query High-Thinking AI Coach. Check server status.");
    } finally {
      setIsBrainstorming(false);
    }
  };

  const handleCheckIn = async (challenge: Challenge) => {
    if (challenge.lastCheckInDate === todayStr) {
      alert("Already checked-in today! Keep it up.");
      return;
    }

    await onCheckInChallenge(challenge.id, todayStr);

    // Trigger visual confetti burst for positive reinforcement!
    const updatedCount = challenge.progress.length + 1;
    const isCompleted = updatedCount >= challenge.durationDays;

    if (isCompleted) {
      // Mega celebration
      const end = Date.now() + (2 * 1000);
      const interval = setInterval(() => {
        if (Date.now() > end) return clearInterval(interval);
        confetti({
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          origin: { x: Math.random(), y: Math.random() - 0.2 }
        });
      }, 200);
    } else {
      // Small celebratory burst
      confetti({
        particleCount: 40,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 40,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black tracking-tight">Challenges</h2>
        
        <button
          onClick={() => setShowBrainstorm(!showBrainstorm)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#0A84FF] hover:bg-[#409CFF] text-white font-bold text-xs shadow-lg shadow-[#0A84FF]/20"
        >
          {showBrainstorm ? <X className="w-4 h-4" /> : <Sparkles className="w-4 h-4 animate-pulse" />}
          {showBrainstorm ? "Close" : "AI Brainstorm"}
        </button>
      </div>

      {/* BRAINSTORM/ADD SHEET */}
      {showBrainstorm && (
        <div className="space-y-4 animate-slide-up">
          {/* iOS Dual Tab Switch within Brainstorm Sheet */}
          <div className={`p-5 rounded-3xl border space-y-4 ${
            darkMode ? "bg-[#1C1C1E] border-[#38383A]" : "bg-white border-stone-200"
          }`}>
            <div className="flex gap-2 items-center text-xs font-bold text-[#0A84FF]">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
              <span>AI Coach Challenge Creator (High-Thinking Pro)</span>
            </div>

            <form onSubmit={handleAIBrainstorm} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">What are your focus areas?</label>
                <textarea
                  required
                  placeholder="e.g. Write more regularly, stop eating fast food, digital detox after 8 PM"
                  value={aiGoals}
                  onChange={(e) => setAiGoals(e.target.value)}
                  rows={2}
                  className={`w-full p-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#0A84FF] ${
                    darkMode ? "bg-black/40 border-[#38383A] text-white" : "bg-stone-50 border-stone-200"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Category</label>
                  <select
                    value={aiCategory}
                    onChange={(e: any) => setAiCategory(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#0A84FF] ${
                      darkMode ? "bg-black/40 border-[#38383A] text-white" : "bg-stone-50 border-stone-200"
                    }`}
                  >
                    <option value="mindfulness">Mindfulness</option>
                    <option value="health">Health & Fitness</option>
                    <option value="learning">Learning & Craft</option>
                    <option value="productivity">Productivity</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={aiDuration}
                    onChange={(e) => setAiDuration(Number(e.target.value))}
                    className={`w-full p-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#0A84FF] ${
                      darkMode ? "bg-black/40 border-[#38383A] text-white" : "bg-stone-50 border-stone-200"
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isBrainstorming || !aiGoals.trim()}
                className="w-full py-2.5 bg-[#0A84FF] hover:bg-[#409CFF] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#0A84FF]/20 flex items-center justify-center gap-2"
              >
                {isBrainstorming ? "AI is Thinking (High Reasoning)..." : "Brainstorm Custom Challenge"}
              </button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-stone-200 dark:border-[#38383A]"></div>
              <span className="flex-shrink mx-4 text-[9px] font-bold uppercase opacity-40">Or Create Manually</span>
              <div className="flex-grow border-t border-stone-200 dark:border-[#38383A]"></div>
            </div>

            {/* Manual Challenge Creation */}
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Challenge Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 30 Days of Sugar Free"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#0A84FF] ${
                      darkMode ? "bg-black/40 border-[#38383A] text-white" : "bg-stone-50 border-stone-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Cut out all processed sugars"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#0A84FF] ${
                      darkMode ? "bg-black/40 border-[#38383A] text-white" : "bg-stone-50 border-stone-200"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#0A84FF] ${
                      darkMode ? "bg-black/40 border-[#38383A] text-white" : "bg-stone-50 border-stone-200"
                    }`}
                  >
                    <option value="mindfulness">Mindfulness</option>
                    <option value="health">Health & Fitness</option>
                    <option value="learning">Learning & Craft</option>
                    <option value="productivity">Productivity</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className={`w-full p-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#0A84FF] ${
                      darkMode ? "bg-black/40 border-[#38383A] text-white" : "bg-stone-50 border-stone-200"
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#0A84FF] hover:bg-[#409CFF] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#0A84FF]/10"
              >
                Launch Challenge
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Visual Analytics Chart Panel */}
      {challenges.length > 0 && (
        <div className={`p-5 rounded-3xl border ${
          darkMode ? "bg-[#1C1C1E] border-[#38383A]" : "bg-white border-stone-200"
        }`}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xs font-extrabold tracking-tight">Active Challenges Progression</h3>
              <p className="text-[10px] opacity-65 font-medium mt-0.5">Completion percentage trajectory over the past week</p>
            </div>
            <div className="flex items-center gap-1 bg-[#0A84FF]/10 text-[#0A84FF] px-2 py-0.5 rounded-md text-[9px] font-bold uppercase">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Live Metrics
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#2C2C2E" : "#E5E5EA"} vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 9, fill: darkMode ? "#8E8E93" : "#8A8A8F" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: darkMode ? "#8E8E93" : "#8A8A8F" }}
                  tickFormatter={(v) => `${v}%`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? "#1C1C1E" : "#FFFFFF",
                    borderColor: darkMode ? "#38383A" : "#E5E5EA",
                    borderRadius: "16px",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                    fontSize: "11px",
                    color: darkMode ? "#FFFFFF" : "#000000"
                  }}
                  itemStyle={{ fontSize: "11px" }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "9px", fontWeight: "bold" }}
                />
                {challenges.map((ch, idx) => (
                  <Line
                    key={ch.id}
                    type="monotone"
                    dataKey={ch.title}
                    stroke={colors[idx % colors.length]}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 1, fill: colors[idx % colors.length] }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ACTIVE CHALLENGES */}
      {challenges.length === 0 ? (
        <div className={`p-8 rounded-3xl border border-dashed text-center ${
          darkMode ? "border-[#38383A] bg-[#1C1C1E]/20 text-stone-500" : "border-stone-200 bg-white/50 text-stone-500"
        }`}>
          <Compass className="w-10 h-10 mx-auto mb-2 opacity-45 text-[#0A84FF]" />
          <p className="text-xs font-semibold">No active challenges.</p>
          <p className="text-[10px] mt-1 opacity-70">Use AI Brainstorm above or create a challenge to start testing yourself.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {challenges.map((item) => {
            const completedCount = item.progress.length;
            const progressPercent = Math.min(100, Math.round((completedCount / item.durationDays) * 100));
            const hasCheckedInToday = item.lastCheckInDate === todayStr;

            return (
              <div
                key={item.id}
                className={`p-5 rounded-3xl border space-y-4 shadow-sm relative ${
                  darkMode ? "bg-[#1C1C1E] border-[#38383A]" : "bg-white border-stone-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#0A84FF]/10 text-[#0A84FF] flex items-center justify-center">
                      <Target className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold tracking-tight">{item.title}</h4>
                      <span className="text-[9px] bg-[#0A84FF]/10 text-[#0A84FF] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-[#0A84FF]/15">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to abandon this challenge? Your progress logs will be deleted.")) {
                        onDeleteChallenge(item.id);
                      }
                    }}
                    className="text-stone-400 hover:text-rose-500 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed pr-2">
                  {item.description}
                </p>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase opacity-60">
                    <span>Progress Tracker</span>
                    <span>{completedCount} / {item.durationDays} Days ({progressPercent}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#0A84FF] to-[#00d6ff] transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Check in controls */}
                <div className="flex gap-2 justify-between items-center pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] opacity-60">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Started: {new Date(item.startDate).toLocaleDateString()}</span>
                  </div>

                  <button
                    onClick={() => handleCheckIn(item)}
                    disabled={hasCheckedInToday}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all flex items-center gap-1.5 ${
                      hasCheckedInToday
                        ? "bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/20"
                        : "bg-[#0A84FF] hover:bg-[#409CFF] text-white shadow-lg shadow-[#0A84FF]/20 active:scale-95"
                    }`}
                  >
                    {hasCheckedInToday ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                        Checked-In Today
                      </>
                    ) : (
                      <>
                        <Flame className="w-3.5 h-3.5" />
                        Log Today's Check-In
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
