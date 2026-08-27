import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

dotenv.config();

const PORT = 3000;
const app = express();

app.use(express.json({ limit: "1mb" }));

// Security & Caching Headers for API Routes
app.use("/api", (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  next();
});

// Lazy-loaded Gemini AI client to prevent startup crashes if key is initially missing.
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required on the server side");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// -------------------------------------------------------------------------
// SERVER-SIDE API ENDPOINTS (Protected from client inspection)
// -------------------------------------------------------------------------

/**
 * Health check endpoint for container orchestrators (Cloud Run, Kubernetes)
 */
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: Date.now(),
    uptime: process.uptime(),
    version: "1.0.0",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

/**
 * Endpoint for Chat with Harmony AI (supports both Pro and Flash-lite)
 */
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, modelType } = req.body;
    
    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const ai = getAIClient();
    const isPro = modelType === "pro";
    const selectedModel = isPro ? "gemini-3.1-pro-preview" : "gemini-3.1-flash-lite";

    // Format historical messages for the new SDK structure
    // SDK expects: contents: [{ role: 'user', parts: [{ text: '...' }] }]
    const formattedContents: any[] = [];
    
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        formattedContents.push({
          role: h.sender === "user" ? "user" : "model",
          parts: [{ text: h.text }],
        });
      });
    }

    // Append current message
    formattedContents.push({
      role: "user",
      parts: [{ text: message }],
    });

    // Setup base configuration
    const config: any = {
      systemInstruction: "You are the Harmony AI Coach, a supportive, minimalist, and insightful personal coordinator. You help users manage their E2E encrypted notes, task routines, and targeted self-challenges (like 30-day habits, writing, fitness, digital detox). You speak in an encouraging, practical, and highly direct tone without fluff or generic advice.",
    };

    // Apply specific parameters based on required capabilities
    if (isPro) {
      // PRO: Set thinkingLevel to ThinkingLevel.HIGH, do not set maxOutputTokens
      config.thinkingConfig = {
        thinkingBudget: -1, // dynamic thinking
        thinkingLevel: ThinkingLevel.HIGH // Enable Deep Thinking
      };
    } else {
      // FLASH-LITE: Optimize for ultra low-latency
      config.temperature = 0.7;
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: formattedContents,
      config,
    });

    const replyText = response.text || "I was unable to process that. Please try again.";

    res.json({
      reply: replyText,
      modelUsed: isPro ? "pro" : "flash",
    });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

/**
 * Endpoint to brainstorm and suggest a targeted self-challenge
 * Utilizes gemini-3.1-pro-preview with HIGH thinking to design complete daily schedules.
 */
app.post("/api/suggest-challenge", async (req, res) => {
  try {
    const { category, currentGoals, durationDays } = req.body;

    if (!category) {
      res.status(400).json({ error: "Category is required" });
      return;
    }

    const ai = getAIClient();
    const prompt = `Design a targeted self-challenge in the category of "${category}".
User's personal focus/goals: "${currentGoals || "General self-improvement"}".
Challenge duration: ${durationDays || 30} days.

Generate a JSON object strictly following this structure:
{
  "title": "Short, catchy iOS-style title",
  "description": "Empowering, brief description of the challenge",
  "durationDays": ${durationDays || 30},
  "category": "${category}",
  "coachingTip": "One high-impact coaching advice to get started",
  "subtasks": [
    "A key recurring daily habit or milestone task to check off"
  ]
}

Return ONLY the raw JSON block without markdown wrappers.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingBudget: -1,
          thinkingLevel: ThinkingLevel.HIGH
        }
      }
    });

    const responseText = response.text || "{}";
    res.json(JSON.parse(responseText.trim()));
  } catch (error: any) {
    console.error("Error in /api/suggest-challenge:", error);
    res.status(500).json({ error: error.message || "Failed to generate challenge" });
  }
});

/**
 * Endpoint to generate a secure AI summary or action points from a decrypted note.
 * Uses gemini-3.1-flash-lite for instant low-latency processing.
 */
app.post("/api/analyze-note", async (req, res) => {
  try {
    const { title, noteContent } = req.body;

    if (!noteContent) {
      res.status(400).json({ error: "Note content is required" });
      return;
    }

    const ai = getAIClient();
    const prompt = `Analyze this note titled "${title || "Untitled Note"}" and provide:
1. A 2-sentence summary.
2. A bulleted list of up to 3 clear, actionable tasks or routines implied in the note.

Format nicely in Markdown. Be concise.

Note Content:
"""
${noteContent}
"""`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        temperature: 0.3,
      }
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error("Error in /api/analyze-note:", error);
    res.status(500).json({ error: error.message || "Failed to analyze note" });
  }
});

/**
 * Endpoint to analyze user task completion patterns and suggest new daily routines.
 * Uses gemini-3.7-flash to discover behavioral patterns and craft balanced routine recommendations.
 */
app.post("/api/suggest-routines", async (req, res) => {
  try {
    const { tasks = [], routines = [], stats = {} } = req.body;

    const ai = getAIClient();

    const tasksSummary = (tasks as any[]).map((t) => ({
      title: t.title,
      category: t.category || "General",
      streak: t.streak || 0,
      completedToday: Boolean(t.completed),
      completedDatesCount: (t.completedDates || []).length,
      dueTime: t.dueTime || "None",
      isRoutineLinked: Boolean(t.routineId)
    }));

    const routinesSummary = (routines as any[]).map((r) => ({
      title: r.title,
      frequency: r.frequency,
      time: r.time || "None"
    }));

    const prompt = `You are an expert productivity and behavioral routine optimization coach.
Analyze the user's task completion patterns, category balance, timing distributions, and consistency streaks below:

Current Tasks & History:
${JSON.stringify(tasksSummary, null, 2)}

Existing Routine Templates:
${JSON.stringify(routinesSummary, null, 2)}

Activity Stats:
${JSON.stringify(stats, null, 2)}

Provide:
1. "insights": An array of 2 to 4 concise, encouraging analytical observations regarding their productivity habits (e.g. category balance, streak strengths, timing bottlenecks, or missing wellness/focus windows).
2. "patternSummary": A 1-2 sentence high-level summary of their overall daily workflow pattern.
3. "suggestions": A list of 2 to 4 actionable, high-impact routine templates designed to complement their existing habits and fill behavioral gaps. Each routine should include:
   - "title": Concise, motivating routine title (e.g., "Post-Work Mindful Winddown", "Deep Focus Morning Block", "Hydration & Mobility Reset")
   - "category": One of "Personal", "Work", "Health", "Mindfulness", "Study", "General"
   - "frequency": "daily" or "weekly"
   - "time": Recommended time in 24-hour HH:MM format (e.g. "07:30", "14:00", "21:00")
   - "reason": Clear 1-sentence behavioral explanation of why this fits their current pattern.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            patternSummary: {
              type: Type.STRING,
              description: "A 1-2 sentence high-level summary of the user's workflow pattern."
            },
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING
              },
              description: "2-4 analytical observations on task completion patterns."
            },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  category: { 
                    type: Type.STRING,
                    description: "Personal, Work, Health, Mindfulness, Study, or General"
                  },
                  frequency: { 
                    type: Type.STRING,
                    description: "daily or weekly"
                  },
                  time: { type: Type.STRING, description: "HH:MM format" },
                  reason: { type: Type.STRING }
                },
                required: ["title", "category", "frequency", "time", "reason"]
              },
              description: "2-4 recommended routine templates."
            }
          },
          required: ["patternSummary", "insights", "suggestions"]
        }
      }
    });

    const responseText = response.text || "{}";
    res.json(JSON.parse(responseText.trim()));
  } catch (error: any) {
    console.error("Error in /api/suggest-routines:", error);
    res.status(500).json({ error: error.message || "Failed to analyze patterns and suggest routines" });
  }
});

// -------------------------------------------------------------------------
// VITE AND STATIC FILE SERVING
// -------------------------------------------------------------------------

async function setupAndStart() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite in development middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Harmony Notes Server running on http://0.0.0.0:${PORT}`);
  });
}

setupAndStart().catch((err) => {
  console.error("Error starting the full-stack server:", err);
  process.exit(1);
});
