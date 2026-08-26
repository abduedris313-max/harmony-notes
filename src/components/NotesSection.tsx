import React from "react";
import { Note } from "../types";
import { 
  Plus, 
  Search, 
  Trash2, 
  Star, 
  Sparkles, 
  X, 
  Save, 
  Tag, 
  Lock,
  Unlock,
  Check,
  FileText,
  Mic,
  MicOff
} from "lucide-react";
import { encryptText, decryptText } from "../crypto";

interface NotesSectionProps {
  notes: Note[];
  onSaveNote: (note: Omit<Note, "id" | "createdAt" | "updatedAt"> & { id?: string }) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  cryptoKey: CryptoKey;
  darkMode: boolean;
  onAddTask: (title: string) => void;
}

export default function NotesSection({
  notes,
  onSaveNote,
  onDeleteNote,
  cryptoKey,
  darkMode,
  onAddTask
}: NotesSectionProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null);
  const [editingNote, setEditingNote] = React.useState<Partial<Note> | null>(null);
  
  // Note formulation states
  const [noteTitle, setNoteTitle] = React.useState("");
  const [noteBody, setNoteBody] = React.useState("");
  const [noteTags, setNoteTags] = React.useState<string[]>([]);
  const [newTagInput, setNewTagInput] = React.useState("");
  const [noteColor, setNoteColor] = React.useState("amber");
  const [isFavorite, setIsFavorite] = React.useState(false);

  // Decrypted cache state to prevent decrypting on every render loop (optimization)
  const [decryptedNotes, setDecryptedNotes] = React.useState<Record<string, string>>({});
  
  // AI Summary states
  const [aiAnalyzing, setAiAnalyzing] = React.useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = React.useState<string | null>(null);

  // Web Speech recognition states
  const [isRecording, setIsRecording] = React.useState(false);
  const [recognitionError, setRecognitionError] = React.useState<string | null>(null);
  const recognitionRef = React.useRef<any>(null);

  React.useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript) {
          setNoteBody((prev) => prev + (prev ? " " : "") + transcript.trim());
        }
      };

      rec.onstart = () => {
        setIsRecording(true);
        setRecognitionError(null);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === "not-allowed") {
          setRecognitionError("Permission denied. Enable mic access.");
        } else {
          setRecognitionError(`Error: ${event.error}`);
        }
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Web Speech API recognition is not supported in this browser. Please use Chrome or Safari.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Color options (Sophisticated iOS Pastel Grid & High-Contrast Immersive Neon)
  const colors = [
    { name: "amber", bg: "bg-amber-50 dark:bg-[#FF9F0A]/10 border-amber-200 dark:border-[#FF9F0A]/20 hover:dark:border-[#FF9F0A]/40", text: "text-amber-800 dark:text-[#FF9F0A]" },
    { name: "indigo", bg: "bg-indigo-50 dark:bg-[#0A84FF]/10 border-indigo-200 dark:border-[#0A84FF]/20 hover:dark:border-[#0A84FF]/40", text: "text-indigo-800 dark:text-[#0A84FF]" },
    { name: "emerald", bg: "bg-emerald-50 dark:bg-[#30D158]/10 border-emerald-200 dark:border-[#30D158]/20 hover:dark:border-[#30D158]/40", text: "text-emerald-800 dark:text-[#30D158]" },
    { name: "rose", bg: "bg-rose-50 dark:bg-[#BF5AF2]/10 border-rose-200 dark:border-[#BF5AF2]/20 hover:dark:border-[#BF5AF2]/40", text: "text-rose-800 dark:text-[#BF5AF2]" },
    { name: "slate", bg: "bg-stone-50 dark:bg-[#1C1C1E] border-stone-200 dark:border-[#38383A] hover:dark:border-[#48484A]", text: "text-stone-800 dark:text-white" },
  ];

  // Perform local decryption of notes
  React.useEffect(() => {
    async function decryptAll() {
      const cache: Record<string, string> = {};
      for (const note of notes) {
        if (!note.encryptedContent) {
          cache[note.id] = "";
          continue;
        }
        try {
          const decrypted = await decryptText(note.encryptedContent, note.iv, cryptoKey);
          cache[note.id] = decrypted;
        } catch (e) {
          cache[note.id] = "🔑 [Error: Unable to decrypt. Invalid security phrase]";
        }
      }
      setDecryptedNotes(cache);
    }
    decryptAll();
  }, [notes, cryptoKey]);

  // Extract all unique tags
  const allTags = React.useMemo(() => {
    const tags = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [notes]);

  // Filter notes
  const filteredNotes = React.useMemo(() => {
    return notes.filter((note) => {
      const decryptedText = decryptedNotes[note.id] || "";
      const matchesSearch = 
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        decryptedText.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTag = selectedTag ? note.tags.includes(selectedTag) : true;
      return matchesSearch && matchesTag;
    }).sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [notes, searchTerm, selectedTag, decryptedNotes]);

  const startNewNote = () => {
    setEditingNote({});
    setNoteTitle("");
    setNoteBody("");
    setNoteTags([]);
    setNoteColor("amber");
    setIsFavorite(false);
    setAiAnalysisResult(null);
  };

  const startEditNote = (note: Note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteBody(decryptedNotes[note.id] || "");
    setNoteTags([...note.tags]);
    setNoteColor(note.color || "amber");
    setIsFavorite(note.isFavorite || false);
    setAiAnalysisResult(null);
  };

  const handleAddTag = () => {
    const clean = newTagInput.trim().toLowerCase();
    if (clean && !noteTags.includes(clean)) {
      setNoteTags([...noteTags, clean]);
      setNewTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setNoteTags(noteTags.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    if (!noteTitle.trim()) return;

    try {
      // 1. Perform Client-side E2E Encryption
      const encrypted = await encryptText(noteBody, cryptoKey);

      // 2. Upload to parent (which submits to Firestore/LocalStore)
      await onSaveNote({
        id: editingNote?.id,
        title: noteTitle.trim(),
        encryptedContent: encrypted.encrypted,
        iv: encrypted.iv,
        tags: noteTags,
        isFavorite: isFavorite,
        color: noteColor,
      });

      setEditingNote(null);
    } catch (error) {
      alert("Encryption & Save failed.");
    }
  };

  const triggerAIAnalysis = async () => {
    if (!noteBody.trim()) return;
    setAiAnalyzing(true);
    setAiAnalysisResult(null);
    try {
      const response = await fetch("/api/analyze-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: noteTitle, noteContent: noteBody }),
      });
      const data = await response.json();
      if (data.analysis) {
        setAiAnalysisResult(data.analysis);
      } else {
        setAiAnalysisResult("Unable to generate analysis. Check console.");
      }
    } catch (e) {
      setAiAnalysisResult("Failed to query low-latency assistant.");
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Turn extracted AI summaries into concrete checklists
  const parseActionItems = (markdownText: string) => {
    const lines = markdownText.split("\n");
    const tasks: string[] = [];
    lines.forEach((line) => {
      const cleanLine = line.trim();
      if (cleanLine.startsWith("- [ ]") || cleanLine.startsWith("-") || cleanLine.match(/^\d+\./)) {
        const text = cleanLine
          .replace(/^- \[ \]/, "")
          .replace(/^-/, "")
          .replace(/^\d+\./, "")
          .trim();
        if (text && text.length > 2) tasks.push(text);
      }
    });
    return tasks.slice(0, 5); // cap at 5
  };

  const importedActionItems = aiAnalysisResult ? parseActionItems(aiAnalysisResult) : [];

  return (
    <div className="space-y-6">
      {/* List Header & Controls */}
      {!editingNote && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black tracking-tight">Personal Notes</h2>
            <button
              onClick={startNewNote}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#0A84FF] hover:bg-[#409CFF] text-white font-bold text-xs shadow-lg shadow-[#0A84FF]/20 transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Note
            </button>
          </div>

          {/* Search bar & Tag selector combo */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search secure title and content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#0A84FF] ${
                darkMode ? "bg-black/40 border-[#38383A] text-white" : "bg-white border-stone-200"
              }`}
            />
          </div>

          {/* Tag filters list */}
          {allTags.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 select-none scrollbar-none">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold transition-all shrink-0 ${
                  selectedTag === null
                    ? "bg-[#0A84FF] text-white shadow-md shadow-[#0A84FF]/10"
                    : darkMode ? "bg-[#1C1C1E] border border-[#38383A] text-[#8E8E93]" : "bg-white text-stone-600 border border-stone-200"
                }`}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold transition-all shrink-0 flex items-center gap-1 border ${
                    selectedTag === tag
                      ? "bg-[#0A84FF] border-transparent text-white shadow-md shadow-[#0A84FF]/10"
                      : darkMode ? "bg-[#1C1C1E] border-[#38383A] text-[#8E8E93]" : "bg-white text-stone-600 border border-stone-200"
                  }`}
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Notes Grid layout */}
          {filteredNotes.length === 0 ? (
            <div className={`p-8 rounded-3xl border border-dashed text-center ${
              darkMode ? "border-stone-800 bg-stone-900/10 text-stone-500" : "border-stone-200 bg-white/50 text-stone-500"
            }`}>
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-45 text-amber-500" />
              <p className="text-xs font-semibold">No notes found.</p>
              <p className="text-[10px] mt-1 opacity-70">Create a secure encrypted note to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredNotes.map((note) => {
                const colorConfig = colors.find((c) => c.name === note.color) || colors[4];
                const decryptedContent = decryptedNotes[note.id];
                const preview = decryptedContent 
                  ? decryptedContent.substring(0, 100) + (decryptedContent.length > 100 ? "..." : "")
                  : "...";

                return (
                  <div
                    key={note.id}
                    onClick={() => startEditNote(note)}
                    className={`p-5 rounded-2xl border flex flex-col justify-between hover:scale-[1.01] active:scale-95 transition-all cursor-pointer shadow-sm relative ${colorConfig.bg}`}
                  >
                    {note.isFavorite && (
                      <Star className="absolute top-4 right-4 w-4 h-4 fill-amber-400 text-amber-400" />
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        {decryptedContent ? (
                          <Unlock className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-stone-400" />
                        )}
                        <h3 className="font-bold text-sm tracking-tight pr-6 line-clamp-1">{note.title}</h3>
                      </div>
                      
                      <p className="text-stone-600 dark:text-stone-400 text-xs leading-relaxed line-clamp-3">
                        {preview}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1 items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {note.tags.slice(0, 2).map((t) => (
                          <span key={t} className="text-[9px] bg-white/60 dark:bg-black/20 px-2 py-0.5 rounded-full font-medium">
                            {t}
                          </span>
                        ))}
                        {note.tags.length > 2 && (
                          <span className="text-[9px] opacity-60">+{note.tags.length - 2}</span>
                        )}
                      </div>
                      <span className="text-[9px] opacity-40">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Editor Sheet View */}
      {editingNote && (
        <div className="space-y-6 animate-slide-up">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setEditingNote(null)}
              className={`p-2.5 rounded-xl transition-all border ${
                darkMode ? "bg-[#1C1C1E] border-[#38383A] text-[#8E8E93] hover:bg-stone-800" : "bg-white text-stone-600 hover:bg-stone-50 border border-stone-200"
              }`}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`p-2.5 rounded-xl border transition-all ${
                  isFavorite 
                    ? "bg-[#FF9F0A]/10 border-[#FF9F0A]/30 text-[#FF9F0A]" 
                    : darkMode ? "bg-[#1C1C1E] border-[#38383A] text-stone-400" : "bg-white border-stone-200 text-stone-400"
                }`}
              >
                <Star className={`w-4 h-4 ${isFavorite ? "fill-[#FF9F0A]" : ""}`} />
              </button>

              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0A84FF] hover:bg-[#409CFF] text-white font-bold text-xs shadow-lg shadow-[#0A84FF]/20"
              >
                <Save className="w-4 h-4" />
                Save Encrypted
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="space-y-4">
            <input
              type="text"
              required
              placeholder="Note Title"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className={`w-full p-4 rounded-2xl text-lg font-bold border focus:outline-none focus:ring-1 focus:ring-[#0A84FF] ${
                darkMode ? "bg-black/40 border-[#38383A]" : "bg-white border-stone-200"
              }`}
            />

            {/* Audio Dictation Control Bar */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
              darkMode ? "bg-[#1C1C1E] border-[#38383A]" : "bg-stone-50 border-stone-200"
            }`}>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                    isRecording
                      ? "bg-[#FF453A] text-white animate-pulse"
                      : "bg-[#0A84FF]/10 text-[#0A84FF] hover:bg-[#0A84FF]/20"
                  }`}
                  title={isRecording ? "Stop voice dictation" : "Start voice dictation"}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <div>
                  <span className="block text-[11px] font-extrabold tracking-tight">
                    {isRecording ? "Listening... Speak now" : "Voice Dictation"}
                  </span>
                  <span className="block text-[9px] opacity-60 font-medium">
                    {recognitionError 
                      ? recognitionError 
                      : isRecording 
                        ? "Speak clearly. Transcript will append below." 
                        : "Click mic to dictate note content securely"
                    }
                  </span>
                </div>
              </div>

              {isRecording && (
                <div className="flex gap-0.5 items-center pr-1.5">
                  <span className="w-1 h-3 bg-[#FF453A] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-1 h-4 bg-[#FF453A] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-1 h-5 bg-[#FF453A] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  <span className="w-1 h-4 bg-[#FF453A] rounded-full animate-bounce" style={{ animationDelay: "450ms" }}></span>
                  <span className="w-1 h-3 bg-[#FF453A] rounded-full animate-bounce" style={{ animationDelay: "600ms" }}></span>
                </div>
              )}
            </div>

            <textarea
              required
              placeholder="Write your secure note content here... Decrypted in browser memory only."
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              rows={8}
              className={`w-full p-4 rounded-2xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#0A84FF] leading-relaxed ${
                darkMode ? "bg-black/40 border-[#38383A]" : "bg-white border-stone-200"
              }`}
            />
          </div>

          {/* Pastel Note Color Selector */}
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-50">Select Theme Color</span>
            <div className="flex gap-2.5">
              {colors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setNoteColor(color.name)}
                  className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${
                    color.name === "amber" ? "bg-[#FF9F0A]" :
                    color.name === "indigo" ? "bg-[#0A84FF]" :
                    color.name === "emerald" ? "bg-[#30D158]" :
                    color.name === "rose" ? "bg-[#BF5AF2]" : "bg-stone-400"
                  } ${
                    noteColor === color.name 
                      ? "border-stone-800 dark:border-white scale-110" 
                      : "border-transparent opacity-70"
                  }`}
                >
                  {noteColor === color.name && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Tags management block */}
          <div className="space-y-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider opacity-50">Tags & Categories</span>
            <div className="flex flex-wrap gap-1.5">
              {noteTags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-[10px] bg-[#0A84FF]/10 text-[#0A84FF] px-2.5 py-1 rounded-full font-bold border border-[#0A84FF]/15"
                >
                  {t}
                  <button type="button" onClick={() => handleRemoveTag(t)}>
                    <X className="w-3 h-3 hover:text-rose-500" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2 max-w-xs">
              <input
                type="text"
                placeholder="new-tag"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className={`px-3 py-1.5 rounded-xl text-[10px] border focus:outline-none focus:ring-1 focus:ring-[#0A84FF] ${
                  darkMode ? "bg-black/40 border-[#38383A]" : "bg-white border-stone-200"
                }`}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3.5 py-1.5 rounded-xl bg-[#0A84FF] hover:bg-[#409CFF] text-white text-[10px] font-bold shadow-md shadow-[#0A84FF]/10"
              >
                Add
              </button>
            </div>
          </div>

          {/* AI Helper Card (Proxies to Gemini 1.5 Flash on backend) */}
          <div className={`p-5 rounded-3xl border ${
            darkMode ? "bg-[#1C1C1E] border-[#38383A]" : "bg-white border-stone-200"
          }`}>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Sparkles className="w-4 h-4 text-[#0A84FF]" />
                <span>AI Assist (Low-Latency Flash)</span>
              </div>
              <button
                onClick={triggerAIAnalysis}
                disabled={aiAnalyzing || !noteBody.trim()}
                className="px-3.5 py-2 rounded-xl bg-[#0A84FF] hover:bg-[#409CFF] text-white font-bold text-[10px] disabled:opacity-40 shadow-md shadow-[#0A84FF]/10"
              >
                {aiAnalyzing ? "Analyzing note..." : "Analyze & Extract Action Items"}
              </button>
            </div>

            {aiAnalysisResult && (
              <div className="space-y-4 animate-fade-in text-xs">
                <div className={`p-4 rounded-2xl border leading-relaxed text-stone-600 dark:text-stone-300 ${
                  darkMode ? "bg-black/40 border-[#38383A]" : "bg-stone-50 border-stone-150"
                }`}>
                  <h4 className="font-bold mb-1 text-[10px] uppercase tracking-wider text-[#0A84FF]">Summary & Action Points</h4>
                  <p className="whitespace-pre-line text-xs">{aiAnalysisResult}</p>
                </div>

                {importedActionItems.length > 0 && (
                  <div className="space-y-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wider opacity-60">Add extracted actions to routines</span>
                    <div className="flex flex-col gap-1.5">
                      {importedActionItems.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex justify-between items-center p-2.5 rounded-xl text-xs border ${
                            darkMode ? "bg-black/40 border-[#38383A]" : "bg-white border-stone-100"
                          }`}
                        >
                          <span className="truncate pr-4">{item}</span>
                          <button
                            onClick={() => {
                              onAddTask(item);
                              alert(`Added task: "${item}" to your Routines tab!`);
                            }}
                            className="text-[10px] text-[#0A84FF] font-bold hover:underline"
                          >
                            + Add Routine Task
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Delete Option (For Existing notes only) */}
          {editingNote.id && (
            <div className="pt-4 border-t border-stone-200 dark:border-[#38383A] flex justify-end">
              <button
                onClick={() => {
                  if (confirm("Are you absolutely sure you want to delete this note permanently? This action is irreversible.")) {
                    onDeleteNote(editingNote.id!);
                    setEditingNote(null);
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 text-[10px] font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Permanent
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
