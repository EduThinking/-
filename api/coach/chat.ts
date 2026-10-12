import { handleCoachChat } from "../../src/server/ai.js";

export const config = { maxDuration: 30 };

// POST /api/coach/chat
export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return Response.json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
    const body = await request.json().catch(() => null);
    const r = await handleCoachChat(body);
    return Response.json(r.body, { status: r.status });
  },
};
