import React from "react";
import IOSLayout from "./components/iOSLayout";
import AuthScreen from "./components/AuthScreen";
import NotesSection from "./components/NotesSection";
import TasksSection from "./components/TasksSection";
import ChallengesSection from "./components/ChallengesSection";
import AssistantSection from "./components/AssistantSection";
import BackupSettings from "./components/BackupSettings";
import { Bell, X, Check as CheckIcon } from "lucide-react";

import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc,
  collectionGroup
} from "firebase/firestore";

import { Note, Task, Routine, Challenge, Message, BackupData } from "./types";

export default function App() {
  const [user, setUser] = React.useState<any>(null);
  const [cryptoKey, setCryptoKey] = React.useState<CryptoKey | null>(null);
  const [passphrase, setPassphrase] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("notes");
  const [darkMode, setDarkMode] = React.useState(false);

  // Core collections data state
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [routines, setRoutines] = React.useState<Routine[]>([]);
  const [challenges, setChallenges] = React.useState<Challenge[]>([]);
  const [messages, setMessages] = React.useState<Message[]>([]);

  // Time-based Alerts state
  const [alerts, setAlerts] = React.useState<{id: string; title: string; dueTime: string; diff: number}[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = React.useState<string[]>([]);

  // UI Load states
  const [assistantLoading, setAssistantLoading] = React.useState(false);
  const [authChecking, setAuthChecking] = React.useState(true);

  // Monitor Firebase auth changes
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        // Reset state on log out - BUT ONLY if we are not currently a guest-offline-user
        setUser((currentUser: any) => {
          if (currentUser?.uid === "guest-offline-user") {
            return currentUser; // keep guest offline user
          }
          // Reset other states
          setCryptoKey(null);
          setPassphrase("");
          setNotes([]);
          setTasks([]);
          setRoutines([]);
          setChallenges([]);
          setMessages([]);
          return null;
        });
      }
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // System Sync Coordinator (Sync real-time with Firestore, fallback to LocalStorage)
  React.useEffect(() => {
    if (!user) return;

    // Load Guest offline data instantly if they are using Guest offline mode
    if (user.uid === "guest-offline-user") {
      const localNotes = localStorage.getItem("harmony_guest_notes");
      const localTasks = localStorage.getItem("harmony_guest_tasks");
      const localRoutines = localStorage.getItem("harmony_guest_routines");
      const localChallenges = localStorage.getItem("harmony_guest_challenges");

      if (localNotes) setNotes(JSON.parse(localNotes));
      if (localTasks) setTasks(JSON.parse(localTasks));
      if (localRoutines) setRoutines(JSON.parse(localRoutines));
      if (localChallenges) setChallenges(JSON.parse(localChallenges));
      return;
    }

    // REAL-TIME FIRESTORE SYNCHRONIZATION
    // Listening to User's private Firestore directories
    const unsubNotes = onSnapshot(collection(db, "users", user.uid, "notes"), (snapshot) => {
      const list: Note[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Note);
      });
      setNotes(list);
    });

    const unsubTasks = onSnapshot(collection(db, "users", user.uid, "tasks"), (snapshot) => {
      const list: Task[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Task);
      });
      setTasks(list);
    });

    const unsubRoutines = onSnapshot(collection(db, "users", user.uid, "routines"), (snapshot) => {
      const list: Routine[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Routine);
      });
      setRoutines(list);
    });

    const unsubChallenges = onSnapshot(collection(db, "users", user.uid, "challenges"), (snapshot) => {
      const list: Challenge[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Challenge);
      });
      setChallenges(list);
    });

    return () => {
      unsubNotes();
      unsubTasks();
      unsubRoutines();
      unsubChallenges();
    };
  }, [user]);

  // Handle Note Save / Update
  const handleSaveNote = async (noteInput: Omit<Note, "id" | "createdAt" | "updatedAt"> & { id?: string }) => {
    const noteId = noteInput.id || doc(collection(db, "temp")).id;
    const now = Date.now();

    const notePayload: Note = {
      id: noteId,
      title: noteInput.title,
      encryptedContent: noteInput.encryptedContent,
      iv: noteInput.iv,
      tags: noteInput.tags,
      isFavorite: noteInput.isFavorite,
      color: noteInput.color,
      createdAt: now,
      updatedAt: now,
    };

    if (user?.uid === "guest-offline-user") {
      const updatedList = noteInput.id 
        ? notes.map((n) => (n.id === noteInput.id ? { ...n, ...noteInput, updatedAt: now } : n))
        : [...notes, notePayload];
      setNotes(updatedList);
      localStorage.setItem("harmony_guest_notes", JSON.stringify(updatedList));
      return;
    }

    if (user) {
      await setDoc(doc(db, "users", user.uid, "notes", noteId), notePayload, { merge: true });
    }
  };

  // Handle Note Delete
  const handleDeleteNote = async (id: string) => {
    if (user?.uid === "guest-offline-user") {
      const updatedList = notes.filter((n) => n.id !== id);
      setNotes(updatedList);
      localStorage.setItem("harmony_guest_notes", JSON.stringify(updatedList));
      return;
    }

    if (user) {
      await deleteDoc(doc(db, "users", user.uid, "notes", id));
    }
  };

  // Handle Task Checkbox Completion & Streak Logger
  const handleCheckTask = async (id: string, date: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const currentlyCompleted = task.completedDates || [];
    const hasCompletedToday = currentlyCompleted.includes(date);

    let nextCompletedDates = [...currentlyCompleted];
    if (hasCompletedToday) {
      // Uncheck
      nextCompletedDates = nextCompletedDates.filter((d) => d !== date);
    } else {
      // Check
      nextCompletedDates.push(date);
    }

    // Streak calculation
    let currentStreak = task.streak;
    if (!hasCompletedToday) {
      currentStreak += 1;
    } else {
      currentStreak = Math.max(0, currentStreak - 1);
    }

    const updatedTask: Partial<Task> = {
      completed: !hasCompletedToday,
      completedDates: nextCompletedDates,
      streak: currentStreak,
    };

    if (user?.uid === "guest-offline-user") {
      const updatedList = tasks.map((t) => (t.id === id ? { ...t, ...updatedTask } : t));
      setTasks(updatedList);
      localStorage.setItem("harmony_guest_tasks", JSON.stringify(updatedList));
      return;
    }

    if (user) {
      await setDoc(doc(db, "users", user.uid, "tasks", id), updatedTask, { merge: true });
    }
  };

  // Handle Task Add
  const handleSaveTask = async (taskInput: Omit<Task, "id" | "createdAt" | "completedDates"> & { id?: string }) => {
    const taskId = taskInput.id || doc(collection(db, "temp")).id;
    const now = Date.now();

    const taskPayload: Task = {
      id: taskId,
      title: taskInput.title,
      completed: taskInput.completed,
      dueDate: taskInput.dueDate,
      dueTime: taskInput.dueTime,
      routineId: taskInput.routineId,
      streak: taskInput.streak,
      createdAt: now,
      completedDates: [],
    };

    if (user?.uid === "guest-offline-user") {
      const updatedList = [...tasks, taskPayload];
      setTasks(updatedList);
      localStorage.setItem("harmony_guest_tasks", JSON.stringify(updatedList));
      return;
    }

    if (user) {
      await setDoc(doc(db, "users", user.uid, "tasks", taskId), taskPayload, { merge: true });
    }
  };

  const handleAddTaskDirectly = (title: string) => {
    handleSaveTask({
      title,
      completed: false,
      dueDate: new Date().toISOString().split("T")[0],
      streak: 0,
    });
  };

  // Delete Task
  const handleDeleteTask = async (id: string) => {
    if (user?.uid === "guest-offline-user") {
      const updatedList = tasks.filter((t) => t.id !== id);
      setTasks(updatedList);
      localStorage.setItem("harmony_guest_tasks", JSON.stringify(updatedList));
      return;
    }

    if (user) {
      await deleteDoc(doc(db, "users", user.uid, "tasks", id));
    }
  };

  // Handle Routine Save
  const handleSaveRoutine = async (routineInput: Omit<Routine, "id" | "createdAt"> & { id?: string }) => {
    const routineId = routineInput.id || doc(collection(db, "temp")).id;
    const now = Date.now();

    const routinePayload: Routine = {
      id: routineId,
      title: routineInput.title,
      frequency: routineInput.frequency,
      time: routineInput.time,
      active: routineInput.active,
      createdAt: now,
    };

    if (user?.uid === "guest-offline-user") {
      const updatedList = [...routines, routinePayload];
      setRoutines(updatedList);
      localStorage.setItem("harmony_guest_routines", JSON.stringify(updatedList));
      return;
    }

    if (user) {
      await setDoc(doc(db, "users", user.uid, "routines", routineId), routinePayload, { merge: true });
    }
  };

  // Delete Routine
  const handleDeleteRoutine = async (id: string) => {
    if (user?.uid === "guest-offline-user") {
      const updatedList = routines.filter((r) => r.id !== id);
      setRoutines(updatedList);
      localStorage.setItem("harmony_guest_routines", JSON.stringify(updatedList));
      return;
    }

    if (user) {
      await deleteDoc(doc(db, "users", user.uid, "routines", id));
    }
  };

  // Handle Challenge Save
  const handleSaveChallenge = async (challengeInput: Omit<Challenge, "id" | "createdAt" | "progress"> & { id?: string }) => {
    const challengeId = challengeInput.id || doc(collection(db, "temp")).id;
    const now = Date.now();

    const challengePayload: Challenge = {
      id: challengeId,
      title: challengeInput.title,
      description: challengeInput.description,
      startDate: challengeInput.startDate,
      durationDays: challengeInput.durationDays,
      active: challengeInput.active,
      progress: [],
      category: challengeInput.category,
      createdAt: now,
    };

    if (user?.uid === "guest-offline-user") {
      const updatedList = [...challenges, challengePayload];
      setChallenges(updatedList);
      localStorage.setItem("harmony_guest_challenges", JSON.stringify(updatedList));
      return;
    }

    if (user) {
      await setDoc(doc(db, "users", user.uid, "challenges", challengeId), challengePayload, { merge: true });
    }
  };

  // Handle Challenge Check In
  const handleCheckInChallenge = async (id: string, date: string) => {
    const challenge = challenges.find((c) => c.id === id);
    if (!challenge) return;

    const currentProg = challenge.progress || [];
    if (currentProg.includes(date)) return;

    const nextProg = [...currentProg, date];
    const updated: Partial<Challenge> = {
      progress: nextProg,
      lastCheckInDate: date,
    };

    if (user?.uid === "guest-offline-user") {
      const updatedList = challenges.map((c) => (c.id === id ? { ...c, ...updated } : c));
      setChallenges(updatedList);
      localStorage.setItem("harmony_guest_challenges", JSON.stringify(updatedList));
      return;
    }

    if (user) {
      await setDoc(doc(db, "users", user.uid, "challenges", id), updated, { merge: true });
    }
  };

  // Delete Challenge
  const handleDeleteChallenge = async (id: string) => {
    if (user?.uid === "guest-offline-user") {
      const updatedList = challenges.filter((c) => c.id !== id);
      setChallenges(updatedList);
      localStorage.setItem("harmony_guest_challenges", JSON.stringify(updatedList));
      return;
    }

    if (user) {
      await deleteDoc(doc(db, "users", user.uid, "challenges", id));
    }
  };

  // Periodic time-based notification system
  React.useEffect(() => {
    if (!user || tasks.length === 0) return;

    const checkTimeBasedTasks = () => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const todayStr = `${yyyy}-${mm}-${dd}`;
      
      const currentHour = today.getHours();
      const currentMinute = today.getMinutes();
      const currentTotalMinutes = currentHour * 60 + currentMinute;

      const activeAlerts: {id: string; title: string; dueTime: string; diff: number}[] = [];

      tasks.forEach((task) => {
        const isCompletedToday = task.completed || (task.completedDates && task.completedDates.includes(todayStr));
        const isForToday = task.dueDate === todayStr;

        if (!isCompletedToday && isForToday) {
          let timeStr = task.dueTime;
          if (!timeStr && task.routineId) {
            const routine = routines.find(r => r.id === task.routineId);
            if (routine && routine.time) {
              timeStr = routine.time;
            }
          }

          if (timeStr) {
            const [dueH, dueM] = timeStr.split(":").map(Number);
            const dueTotalMinutes = dueH * 60 + dueM;
            const diff = dueTotalMinutes - currentTotalMinutes;

            // Trigger alert if it's within 30 minutes in the future
            if (diff > 0 && diff <= 30) {
              if (!dismissedAlerts.includes(task.id)) {
                activeAlerts.push({
                  id: task.id,
                  title: task.title,
                  dueTime: timeStr,
                  diff
                });
              }
            }
          }
        }
      });

      setAlerts(activeAlerts);
    };

    checkTimeBasedTasks();
    const interval = setInterval(checkTimeBasedTasks, 15000);
    return () => clearInterval(interval);
  }, [tasks, routines, dismissedAlerts, user]);

  // JSON Restorer
  const handleRestoreBackup = async (backup: BackupData) => {
    if (user?.uid === "guest-offline-user") {
      setNotes(backup.notes);
      setTasks(backup.tasks);
      setRoutines(backup.routines);
      setChallenges(backup.challenges);

      localStorage.setItem("harmony_guest_notes", JSON.stringify(backup.notes));
      localStorage.setItem("harmony_guest_tasks", JSON.stringify(backup.tasks));
      localStorage.setItem("harmony_guest_routines", JSON.stringify(backup.routines));
      localStorage.setItem("harmony_guest_challenges", JSON.stringify(backup.challenges));
      return;
    }

    if (user) {
      // Submit elements to Firestore sequentially
      for (const note of backup.notes) {
        await setDoc(doc(db, "users", user.uid, "notes", note.id), note);
      }
      for (const task of backup.tasks) {
        await setDoc(doc(db, "users", user.uid, "tasks", task.id), task);
      }
      for (const routine of backup.routines) {
        await setDoc(doc(db, "users", user.uid, "routines", routine.id), routine);
      }
      for (const challenge of backup.challenges) {
        await setDoc(doc(db, "users", user.uid, "challenges", challenge.id), challenge);
      }
    }
  };

  // Delete everything
  const handleClearLocalData = () => {
    // Clear validation checks
    if (user) {
      localStorage.removeItem(`harmony_vault_check_${user.uid}`);
      localStorage.removeItem(`harmony_vault_hint_${user.uid}`);
    }
    // Clear local guest keys
    localStorage.removeItem("harmony_guest_notes");
    localStorage.removeItem("harmony_guest_tasks");
    localStorage.removeItem("harmony_guest_routines");
    localStorage.removeItem("harmony_guest_challenges");

    signOut(auth);
    setCryptoKey(null);
    setPassphrase("");
    setUser(null);
  };

  // AI Assistant message dispatcher (Supports Dual Engine model routing)
  const handleSendMessage = async (text: string, modelType: 'flash' | 'pro') => {
    const userMsg: Message = {
      id: doc(collection(db, "temp")).id,
      text,
      sender: "user",
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setAssistantLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10), // keep chat window lightweight
          modelType,
        }),
      });

      const data = await response.json();
      if (data.reply) {
        const replyMsg: Message = {
          id: doc(collection(db, "temp")).id,
          text: data.reply,
          sender: "assistant",
          timestamp: Date.now(),
          modelUsed: data.modelUsed,
        };
        setMessages((prev) => [...prev, replyMsg]);
      }
    } catch (e) {
      const errorMsg: Message = {
        id: doc(collection(db, "temp")).id,
        text: "I experienced a connection issue on my server-side proxy. Please verify your GEMINI_API_KEY.",
        sender: "assistant",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setAssistantLoading(false);
    }
  };

  // Loading indicator for Firebase handshakes
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F4F3F0] flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-bold text-stone-500 mt-4 tracking-wide uppercase">Connecting Harmony Network...</span>
      </div>
    );
  }

  // Vault/Crypto Gate Screen
  if (!user || !cryptoKey) {
    return (
      <AuthScreen
        darkMode={darkMode}
        onAuthenticated={(authUser, derivedKey, phrase) => {
          setUser(authUser);
          setCryptoKey(derivedKey);
          setPassphrase(phrase);
        }}
      />
    );
  }

  return (
    <IOSLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      userEmail={user.email}
      onLogout={() => {
        signOut(auth);
        setCryptoKey(null);
        setPassphrase("");
      }}
      isUnlocked={!!cryptoKey}
    >
      {/* Dynamic Section Router */}
      {activeTab === "notes" && (
        <NotesSection
          notes={notes}
          onSaveNote={handleSaveNote}
          onDeleteNote={handleDeleteNote}
          cryptoKey={cryptoKey}
          darkMode={darkMode}
          onAddTask={handleAddTaskDirectly}
        />
      )}

      {activeTab === "tasks" && (
        <TasksSection
          tasks={tasks}
          routines={routines}
          onSaveTask={handleSaveTask}
          onCheckTask={handleCheckTask}
          onDeleteTask={handleDeleteTask}
          onSaveRoutine={handleSaveRoutine}
          onDeleteRoutine={handleDeleteRoutine}
          darkMode={darkMode}
        />
      )}

      {activeTab === "challenges" && (
        <ChallengesSection
          challenges={challenges}
          onSaveChallenge={handleSaveChallenge}
          onCheckInChallenge={handleCheckInChallenge}
          onDeleteChallenge={handleDeleteChallenge}
          darkMode={darkMode}
        />
      )}

      {activeTab === "assistant" && (
        <AssistantSection
          messages={messages}
          onSendMessage={handleSendMessage}
          loading={assistantLoading}
          darkMode={darkMode}
        />
      )}

      {activeTab === "settings" && (
        <BackupSettings
          notes={notes}
          tasks={tasks}
          routines={routines}
          challenges={challenges}
          onRestoreBackup={handleRestoreBackup}
          onClearLocalData={handleClearLocalData}
          userEmail={user.email}
          darkMode={darkMode}
          passphraseHint={localStorage.getItem(`harmony_vault_hint_${user.uid}`) || ""}
        />
      )}

      {/* Time-based Notification Toasts */}
      {alerts.length > 0 && (
        <div className="fixed top-6 right-6 z-50 max-w-sm w-full space-y-3 pointer-events-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-start gap-3 transition-all duration-300 ${
                darkMode 
                  ? "bg-[#1C1C1E]/95 border-[#FF9F0A]/30 text-white shadow-black/80" 
                  : "bg-white border-[#FF9F0A]/40 text-stone-900 shadow-stone-200"
              }`}
            >
              <div className="p-2 rounded-xl bg-[#FF9F0A]/10 text-[#FF9F0A] shrink-0">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-extrabold tracking-tight">Upcoming Deadline</h4>
                <p className="text-[11px] opacity-90 mt-0.5 font-medium line-clamp-2">
                  "{alert.title}" is due in <span className="font-bold text-[#FF9F0A]">{alert.diff} min</span> ({alert.dueTime}).
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split("T")[0];
                      handleCheckTask(alert.id, today);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#30D158] hover:bg-[#34C759] text-white text-[9px] font-bold transition-all flex items-center gap-0.5 cursor-pointer"
                  >
                    <CheckIcon className="w-3 h-3 stroke-[3px]" /> Complete
                  </button>
                  <button
                    onClick={() => setDismissedAlerts((prev) => [...prev, alert.id])}
                    className="px-2.5 py-1 rounded-lg bg-stone-500/10 hover:bg-stone-500/20 text-stone-400 text-[9px] font-bold transition-all cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              <button
                onClick={() => setDismissedAlerts((prev) => [...prev, alert.id])}
                className="text-stone-400 hover:text-stone-100 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </IOSLayout>
  );
}
