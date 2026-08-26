import React from "react";
import { Message } from "../types";
import { 
  Send, 
  Sparkles, 
  Zap, 
  User, 
  HelpCircle, 
  ArrowUpCircle,
  TrendingUp,
  BrainCircuit,
  MessageSquareOff
} from "lucide-react";

interface AssistantSectionProps {
  messages: Message[];
  onSendMessage: (text: string, modelType: 'flash' | 'pro') => Promise<void>;
  loading: boolean;
  darkMode: boolean;
}

export default function AssistantSection({
  messages,
  onSendMessage,
  loading,
  darkMode
}: AssistantSectionProps) {
  const [inputText, setInputText] = React.useState("");
  const [modelType, setModelType] = React.useState<'flash' | 'pro'>('flash');
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputText.trim();
    if (!clean || loading) return;

    onSendMessage(clean, modelType);
    setInputText("");
  };

  const sampleBubbles = [
    { text: "Suggest a healthy morning routine", type: "flash" as const },
    { text: "Design a 7-day digital detox challenge", type: "pro" as const },
    { text: "How does end-to-end encryption keep me safe?", type: "flash" as const },
  ];

  return (
    <div className="flex flex-col h-[70vh] max-h-[700px] space-y-4 animate-fade-in">
      {/* Header Info */}
      <div className={`p-4 rounded-3xl border flex items-center gap-3 ${
        darkMode ? "bg-[#1C1C1E] border-[#38383A]" : "bg-white border-stone-200"
      }`}>
        <div className="w-10 h-10 rounded-2xl bg-[#0A84FF]/10 text-[#0A84FF] flex items-center justify-center border border-[#0A84FF]/15 shrink-0">
          <BrainCircuit className="w-5.5 h-5.5" />
        </div>
        <div>
          <h3 className="text-xs font-extrabold tracking-tight">Harmony AI Coach</h3>
          <p className="text-[10px] text-stone-500">
            Powered by dual Gemini engines. Toggle below for speed or depth.
          </p>
        </div>
      </div>

      {/* Message Feed container */}
      <div className={`flex-1 overflow-y-auto p-4 rounded-3xl border space-y-4 ${
        darkMode ? "bg-black/40 border-[#38383A]" : "bg-[#FBFBFA] border-stone-200"
      }`}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center px-4 space-y-4">
            <BrainCircuit className="w-10 h-10 text-[#0A84FF] opacity-40 animate-pulse" />
            <div className="space-y-1">
              <p className="text-xs font-bold">Welcome to Harmony AI Coach</p>
              <p className="text-[10px] text-stone-500 max-w-[240px] leading-relaxed mx-auto">
                Ask about self-challenges, habits, notes encryption, or planning.
              </p>
            </div>

            {/* Starter templates list */}
            <div className="w-full max-w-xs space-y-2 pt-2">
              {sampleBubbles.map((bubble, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setModelType(bubble.type);
                    onSendMessage(bubble.text, bubble.type);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-[10px] font-medium text-left transition-all active:scale-98 flex items-center justify-between ${
                    darkMode 
                      ? "bg-[#1C1C1E] border-[#38383A] hover:bg-stone-800 text-stone-300" 
                      : "bg-white border-stone-200 hover:bg-stone-50 text-stone-600 shadow-sm"
                  }`}
                >
                  <span>{bubble.text}</span>
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                    bubble.type === "pro" 
                      ? "bg-[#FF9F0A]/15 text-[#FF9F0A] border border-[#FF9F0A]/20" 
                      : "bg-[#0A84FF]/15 text-[#0A84FF] border border-[#0A84FF]/20"
                  }`}>
                    {bubble.type}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : ""}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border shrink-0 ${
                    isUser
                      ? "bg-[#0A84FF]/10 border-[#0A84FF]/20 text-[#0A84FF]"
                      : "bg-[#1C1C1E] border-[#38383A] text-[#0A84FF]"
                  }`}>
                    {isUser ? <User className="w-3.5 h-3.5" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                  </div>

                  <div className="space-y-1">
                    <div className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-sm ${
                      isUser
                        ? "bg-[#0A84FF] text-white rounded-tr-none"
                        : darkMode 
                          ? "bg-[#1C1C1E] border border-[#38383A] text-[#E5E5EA] rounded-tl-none" 
                          : "bg-white border border-stone-150 text-stone-800 rounded-tl-none"
                    }`}>
                      {msg.text}
                    </div>

                    {!isUser && msg.modelUsed && (
                      <span className="block text-[8px] text-right opacity-40 font-bold uppercase tracking-widest">
                        {msg.modelUsed === "pro" ? "🧠 Pro (HIGH THINKING)" : "⚡ Quick Flash"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Active Thinking Loader Bubble */}
            {loading && (
              <div className="flex gap-2.5 max-w-[85%] animate-pulse">
                <div className="w-7 h-7 rounded-full bg-[#0A84FF]/10 text-[#0A84FF] flex items-center justify-center border border-[#0A84FF]/15 shrink-0">
                  <BrainCircuit className="w-3.5 h-3.5 animate-spin-slow" />
                </div>
                <div className="space-y-1">
                  <div className={`p-3.5 rounded-2xl text-xs border ${
                    darkMode ? "bg-[#1C1C1E]/60 border-[#38383A] text-stone-450" : "bg-white border-stone-150 text-stone-500"
                  }`}>
                    {modelType === "pro" ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1 text-[10px] text-[#FF9F0A] font-extrabold uppercase tracking-wider">
                          <BrainCircuit className="w-3.5 h-3.5 animate-pulse" />
                          <span>AI Coach is processing high-reasoning trees...</span>
                        </div>
                        <p className="text-[9px] opacity-70">Structuring deep checklists and behavioral planning suggestions.</p>
                      </div>
                    ) : (
                      <span>Synthesizing quick response...</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* Input controls panel */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Engine switcher controls */}
        <div className={`p-1 rounded-xl flex max-w-xs border ${
          darkMode ? "bg-black/40 border-[#38383A]" : "bg-stone-100 border-stone-200"
        }`}>
          <button
            type="button"
            onClick={() => setModelType('flash')}
            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 ${
              modelType === 'flash'
                ? "bg-[#0A84FF] text-white shadow-md shadow-[#0A84FF]/10"
                : "text-[#8E8E93] hover:text-stone-300"
            }`}
          >
            <Zap className="w-3 h-3" />
            Flash (Lite Speed)
          </button>
          <button
            type="button"
            onClick={() => setModelType('pro')}
            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 ${
              modelType === 'pro'
                ? "bg-[#FF9F0A] text-white shadow-md shadow-[#FF9F0A]/10"
                : "text-[#8E8E93] hover:text-stone-300"
            }`}
          >
            <Sparkles className="w-3 h-3 text-[#FF9F0A] dark:text-white" />
            Pro (High Thinking)
          </button>
        </div>

        {/* Input box */}
        <div className="flex gap-2">
          <input
            type="text"
            required
            disabled={loading}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              modelType === 'pro' 
                ? "Ask for deep planning, custom schedules (Pro Thinking)..." 
                : "Ask for fast recommendations, summaries (Flash)..."
            }
            className={`flex-1 px-4 py-3 rounded-2xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#0A84FF] ${
              darkMode ? "bg-black/40 border-[#38383A] text-white" : "bg-white border-stone-200"
            }`}
          />
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="p-3 bg-[#0A84FF] hover:bg-[#409CFF] disabled:opacity-45 text-white rounded-2xl shadow-lg shadow-[#0A84FF]/20 transition-transform active:scale-95 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
