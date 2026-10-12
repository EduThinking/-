import { handleVoiceParse } from "../../src/server/ai.js";

// POST /api/voice/parse
export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return Response.json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
    const body = await request.json().catch(() => null);
    const r = await handleVoiceParse(body);
    return Response.json(r.body, { status: r.status });
  },
};
