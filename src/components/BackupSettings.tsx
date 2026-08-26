import React from "react";
import { BackupData, Note, Task, Routine, Challenge } from "../types";
import { 
  Download, 
  Upload, 
  RotateCcw, 
  Trash2, 
  CloudLightning, 
  ShieldAlert, 
  Save, 
  Check,
  RefreshCw,
  FileJson
} from "lucide-react";

interface BackupSettingsProps {
  notes: Note[];
  tasks: Task[];
  routines: Routine[];
  challenges: Challenge[];
  onRestoreBackup: (data: BackupData) => Promise<void>;
  onClearLocalData: () => void;
  userEmail?: string | null;
  darkMode: boolean;
  passphraseHint?: string;
}

export default function BackupSettings({
  notes,
  tasks,
  routines,
  challenges,
  onRestoreBackup,
  onClearLocalData,
  userEmail,
  darkMode,
  passphraseHint
}: BackupSettingsProps) {
  const [backupSuccess, setBackupSuccess] = React.useState(false);
  const [restoreSuccess, setRestoreSuccess] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Manual Export of all Local Data
  const handleExportBackup = () => {
    try {
      const backup: BackupData = {
        notes,
        tasks,
        routines,
        challenges,
        backupTimestamp: Date.now(),
        appVersion: "1.0.0"
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `HarmonyNotes_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setBackupSuccess(true);
      setTimeout(() => setBackupSuccess(false), 3000);
    } catch (e) {
      setErrorMessage("Export failed.");
    }
  };

  // Manual Restore of JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage("");
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed: BackupData = JSON.parse(text);

        if (!parsed.notes || !parsed.tasks || !parsed.challenges || !parsed.routines) {
          setErrorMessage("Invalid backup structure. Required fields missing.");
          return;
        }

        await onRestoreBackup(parsed);
        setRestoreSuccess(true);
        setTimeout(() => setRestoreSuccess(false), 3000);
      } catch (err) {
        setErrorMessage("Restore failed. Ensure the JSON backup file is valid.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-fade-in text-xs">
      {/* Vault Status card */}
      <div className={`p-5 rounded-3xl border ${
        darkMode ? "bg-[#1C1C1E] border-[#38383A]" : "bg-white border-stone-200 shadow-sm"
      }`}>
        <h4 className="text-sm font-extrabold tracking-tight mb-2 flex items-center gap-1.5">
          <CloudLightning className="w-4.5 h-4.5 text-[#0A84FF]" />
          Active Account Status
        </h4>

        <div className="space-y-1.5 text-stone-500">
          <p>
            Logged In as: <strong className={darkMode ? "text-stone-200" : "text-stone-800"}>{userEmail || "Guest Session"}</strong>
          </p>
          <p>
            Total Notes: <span className="font-semibold text-[#0A84FF]">{notes.length}</span> (Fully E2E encrypted)
          </p>
          <p>
            Security Validation Passphrase Hint: <span className="font-mono text-[10px] bg-stone-100 dark:bg-black/40 px-2 py-0.5 rounded border dark:border-[#38383A]">{passphraseHint || "Unavailable"}</span>
          </p>
        </div>
      </div>

      {/* Manual Backup Operations */}
      <div className={`p-5 rounded-3xl border space-y-4 ${
        darkMode ? "bg-[#1C1C1E] border-[#38383A]" : "bg-white border-stone-200 shadow-sm"
      }`}>
        <h4 className="text-sm font-extrabold tracking-tight mb-1 flex items-center gap-1.5">
          <FileJson className="w-4.5 h-4.5 text-[#0A84FF]" />
          Offline Data Backup System
        </h4>
        <p className="text-[10px] text-stone-500 leading-relaxed">
          Harmony Notes does not hold your decryption phrase. To guarantee zero data-loss, export your encrypted backup locally.
        </p>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {/* Export Action */}
          <button
            onClick={handleExportBackup}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all ${
              backupSuccess
                ? "bg-[#30D158] text-white shadow-md shadow-[#30D158]/20"
                : "bg-[#0A84FF] hover:bg-[#409CFF] text-white shadow-lg shadow-[#0A84FF]/20"
            }`}
          >
            {backupSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[3px]" />
                Backup Exported
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export Encrypted JSON
              </>
            )}
          </button>

          {/* Import Action */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportBackup}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold border transition-all ${
              restoreSuccess
                ? "bg-[#30D158] text-white border-transparent"
                : darkMode ? "bg-black/40 hover:bg-stone-800 border-[#38383A] text-[#E5E5EA]" : "bg-white hover:bg-stone-50 border-stone-200 text-stone-700 shadow-sm"
            }`}
          >
            {restoreSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[3px]" />
                Data Restored
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import & Restore JSON
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dangerous/Reset Options */}
      <div className={`p-5 rounded-3xl border border-red-500/20 space-y-4 ${
        darkMode ? "bg-red-500/5" : "bg-red-50/20"
      }`}>
        <h4 className="text-sm font-extrabold tracking-tight text-[#FF453A] flex items-center gap-1.5">
          <ShieldAlert className="w-4.5 h-4.5" />
          Vault Destruction
        </h4>
        <p className="text-[10px] text-stone-500 leading-relaxed">
          Destroying local session logs clears browser cache, cookies, and local credentials. Your encrypted notes saved in Firestore remain safe but you must log back in to decrypt them.
        </p>

        <button
          onClick={() => {
            if (confirm("DANGER: Wiping keys is irreversible unless you know your original security phrase! Restoring defaults resets all settings. Continue?")) {
              onClearLocalData();
            }
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-500/30 text-[#FF453A] hover:bg-red-500/10 font-bold transition-all"
        >
          <Trash2 className="w-4 h-4" />
          Reset Defaults & Lock Vault
        </button>
      </div>
    </div>
  );
}
