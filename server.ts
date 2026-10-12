import "dotenv/config"; // first, so the AI module sees GEMINI_API_KEY from .env
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { handleCoachChat, handleHealth, handleVoiceParse } from "./src/server/ai";

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "200kb" }));

  const send = (res: express.Response, r: { status: number; body: unknown }) => res.status(r.status).json(r.body);
  app.get("/api/health", (_req, res) => send(res, handleHealth()));
  app.post("/api/voice/parse", async (req, res) => send(res, await handleVoiceParse(req.body)));
  app.post("/api/coach/chat", async (req, res) => send(res, await handleCoachChat(req.body)));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    const { ai } = handleHealth().body as { ai: boolean };
    console.log(`[Baby Sleep Coach] http://localhost:${PORT}  (AI: ${ai ? "Gemini" : "rules only — set GEMINI_API_KEY to enable"})`);
  });
}

startServer().catch((error) => {
  console.error("Fatal error starting server:", error);
});
