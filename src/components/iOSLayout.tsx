import React from "react";
import { CDN_ASSETS } from "../constants/cdnAssets";
import { 
  FileText, 
  CheckSquare, 
  Compass, 
  MessageSquare, 
  Settings, 
  Moon, 
  Sun,
  User,
  ShieldAlert,
  Battery,
  Wifi,
  Signal
} from "lucide-react";

interface iOSLayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  userEmail?: string | null;
  onLogout?: () => void;
  isUnlocked: boolean;
  children: React.ReactNode;
}

export default function IOSLayout({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  userEmail,
  onLogout,
  isUnlocked,
  children
}: iOSLayoutProps) {
  // Simple simulator clock that matches real-time format
  const [time, setTime] = React.useState("09:41");

  React.useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      setTime(`${hours}:${minutes} ${ampm}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 60000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: "notes", label: "Notes", icon: FileText },
    { id: "tasks", label: "Routines", icon: CheckSquare },
    { id: "challenges", label: "Challenges", icon: Compass },
    { id: "assistant", label: "AI Coach", icon: MessageSquare },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div 
      className={`min-h-screen flex flex-col transition-colors duration-300 font-sans ${
        darkMode ? "text-[#FFFFFF]" : "bg-[#F4F3F0] text-stone-900"
      }`}
      style={darkMode ? { background: "radial-gradient(circle at 0% 0%, #1a1a1a 0%, #000000 100%)" } : undefined}
    >
      {/* simulated iOS Status Bar (Premium Design Polish) */}
      <div className={`px-5 py-2 flex justify-between items-center text-xs font-semibold select-none ${
        darkMode ? "bg-black/30 text-[#8E8E93] border-b border-[#38383A]" : "bg-[#F4F3F0] text-stone-500 border-b border-stone-200"
      }`}>
        <div className="flex items-center gap-1.5">
          <span>{time}</span>
        </div>
        <div className="flex items-center gap-2">
          <Signal className="w-3 h-3" />
          <span className="text-[10px]">5G</span>
          <Wifi className="w-3.5 h-3.5" />
          <div className="flex items-center gap-0.5">
            <Battery className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Top Brand Header */}
      <header className={`px-5 py-4 flex justify-between items-center ${
        darkMode ? "bg-[#1C1C1E]/60 border-b border-[#38383A]" : "bg-white/80 border-b border-stone-200"
      } backdrop-blur-md sticky top-0 z-40`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-tr from-[#0A84FF] to-[#5E5CE6] rounded-xl flex items-center justify-center shadow-lg shadow-[#0A84FF]/20 overflow-hidden p-1.5">
            <img 
              src={CDN_ASSETS.appLogoWhite} 
              alt="Harmony Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Harmony Notes</h1>
            {isUnlocked && (
              <span className="text-[10px] bg-[#30D158]/10 text-[#30D158] px-1.5 py-0.2 rounded-full font-semibold border border-[#30D158]/20">
                E2EE Active
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full transition-all ${
              darkMode 
                ? "bg-[#1C1C1E] text-amber-400 border border-[#38383A] hover:bg-stone-800" 
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>

          {/* User Email & Logout indicator */}
          {userEmail && (
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline text-xs opacity-70 truncate max-w-[120px]">{userEmail}</span>
              <button
                onClick={onLogout}
                className={`p-2 rounded-full transition-all border ${
                  darkMode ? "bg-[#1C1C1E] border-[#38383A] text-rose-400 hover:bg-stone-800" : "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100"
                }`}
                title="Sign Out"
              >
                <User className="w-4.5 h-4.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 pb-28">
        {children}
      </main>

      {/* iOS styled Bottom Tab Navigation Bar */}
      <nav className={`fixed bottom-0 left-0 right-0 z-40 border-t ${
        darkMode ? "bg-[#1C1C1E]/95 border-[#38383A]" : "bg-white/95 border-stone-200"
      } backdrop-blur-lg pb-safe`}>
        <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all ${
                  isSelected 
                    ? "text-[#0A84FF] scale-105" 
                    : darkMode ? "text-[#8E8E93] hover:text-[#FFFFFF]" : "text-stone-400 hover:text-stone-600"
                }`}
              >
                <IconComponent className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-semibold tracking-wide">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
