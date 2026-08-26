export interface Note {
  id: string;
  title: string;
  encryptedContent: string; // AES-GCM cipher text
  iv: string; // Base64 Initialization Vector
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
  color?: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  routineId?: string; // Links task to a routine
  createdAt: number;
  completedDates?: string[]; // YYYY-MM-DD completion logs
  streak: number;
}

export interface Routine {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly';
  daysOfWeek?: number[]; // [0-6] for weekly routines
  time?: string; // e.g. "08:30"
  active: boolean;
  createdAt: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  durationDays: number;
  active: boolean;
  progress: string[]; // dates of check-in, e.g., ["2026-08-23", "2026-08-24"]
  category: 'health' | 'learning' | 'mindfulness' | 'productivity';
  aiCoachingLogs?: { date: string; content: string }[];
  lastCheckInDate?: string;
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  backupInterval: 'never' | 'daily' | 'weekly';
  lastBackupAt?: number;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: number;
  modelUsed?: 'flash' | 'pro';
  thinkingText?: string;
}

export interface BackupData {
  notes: Note[];
  tasks: Task[];
  routines: Routine[];
  challenges: Challenge[];
  backupTimestamp: number;
  appVersion: string;
}
