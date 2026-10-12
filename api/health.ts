import { handleHealth } from "../src/server/ai.js";

// GET /api/health — reports whether GEMINI_API_KEY is configured (never the key itself)
export default {
  fetch() {
    const r = handleHealth();
    return Response.json(r.body, { status: r.status });
  },
};
