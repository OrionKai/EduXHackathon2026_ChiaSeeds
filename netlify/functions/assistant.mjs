// WorldQuest quest assistant: the only place the app calls a real LLM.
// Runs on Netlify Functions. The API key lives in the ANTHROPIC_API_KEY environment variable
// (Netlify → Site configuration → Environment variables, marked secret) and never reaches the browser.
//
// Design-time only (per the Product Explanation): the educator asks for changes; Claude proposes edits
// to the AI-drafted tracks through two tools. The browser applies them as "AI revised" items that the
// educator must approve again. Gameplay never calls this endpoint.
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

const TOPICS = ["A", "B", "C", "D"];

const SYSTEM = `You are the quest assistant inside WorldQuest, helping a secondary-school educator (students aged 13-16) refine a Jigsaw museum quest before it is published.

The quest's expert tracks are listed under CURRENT TRACKS (one letter each). Each student investigates one track at a real gallery, then teaches their home team; an escape-room finale needs all four perspectives.

Rules you must follow:
- Use ONLY facts from the APPROVED SOURCES provided. Each has an id (S1, S2, ...); they may be official pages, the community partner's contribution, or notes the educator added. Never invent museum facts, dates, object details or cultural interpretations. If a request needs facts the sources don't contain, say so and suggest the educator ask the community partner.
- Hints must guide students back to observing the real object. A hint must never give the answer and must never contain another track's evidence.
- Write for ages 13-16: short sentences, plain words.
- Keep each track's evidence fields unchanged; you may revise its wording (observe, discuss, narrative, fallback, teachHeadline) or add hints.
- Every change you make is a proposal: the educator approves it. Never claim something is confirmed with the museum or partner.
- To change the draft, call the tools. To answer a question, just reply.
- Reply in at most 3 short sentences, and cite the sources you used like [S2].`;

const TOOLS = [
  {
    name: "revise_track",
    description: "Propose new wording for one field of one expert track. Use for simplifying, clarifying, adapting to time or venue, or adding an accessible/fallback route. Returns nothing; the educator reviews the change.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        topic: { type: "string", enum: TOPICS },
        field: { type: "string", enum: ["observe", "discuss", "narrative", "fallback", "teachHeadline"] },
        new_text: { type: "string", description: "The full replacement text for that field." },
        source_ids: { type: "array", items: { type: "string" }, description: "Ids of the approved sources this change relies on, e.g. S2." },
        summary: { type: "string", description: "One sentence for the educator describing what changed and why." },
      },
      required: ["topic", "field", "new_text", "source_ids", "summary"],
      additionalProperties: false,
    },
  },
  {
    name: "add_hint",
    description: "Propose one extra hint for a track. The hint must point students back to the real object and must not reveal the answer or another track's evidence.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        topic: { type: "string", enum: TOPICS },
        hint: { type: "string" },
        source_ids: { type: "array", items: { type: "string" } },
        summary: { type: "string" },
      },
      required: ["topic", "hint", "source_ids", "summary"],
      additionalProperties: false,
    },
  },
];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: "not_configured" }, 503);
  const pass = process.env.DEMO_PASSCODE;
  if (pass && req.headers.get("x-demo-passcode") !== pass) return json({ error: "passcode" }, 401);

  const raw = await req.text();
  if (raw.length > 30000) return json({ error: "too_large" }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: "bad_json" }, 400); }
  const { message, quest, tracks, sources, history } = body || {};
  if (typeof message !== "string" || !message.trim() || message.length > 1000) return json({ error: "bad_message" }, 400);

  // Short text-only history (alternating user/assistant), newest last.
  const past = Array.isArray(history)
    ? history.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim()).slice(-6)
    : [];
  while (past.length && past[0].role !== "user") past.shift();
  if (past.length && past[past.length - 1].role === "user") past.pop();

  const knownIds = new Set((Array.isArray(sources) ? sources : []).map((x) => x && x.id).filter(Boolean));
  const context = `QUEST SETTINGS: ${JSON.stringify(quest || {})}
CURRENT TRACKS (approved by the educator or awaiting approval): ${JSON.stringify(tracks || {})}
APPROVED SOURCES: ${JSON.stringify(sources || [])}

EDUCATOR'S REQUEST: ${message.trim()}`;

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SYSTEM,
      tools: TOOLS,
      tool_choice: { type: "auto" },
      messages: [...past, { role: "user", content: context }],
    });

    if (response.stop_reason === "refusal") {
      return json({ reply: "I can't help with that request. Try rephrasing it as a change to one of the tracks.", edits: [] });
    }
    const reply = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    const edits = response.content
      .filter((b) => b.type === "tool_use")
      .map((b) => ({ tool: b.name, input: b.input }))
      .filter((e) => TOPICS.includes(e.input?.topic))
      .map((e) => ({ ...e, input: { ...e.input, source_ids: (e.input.source_ids || []).filter((id) => knownIds.has(id)) } }));
    return json({
      reply: reply || (edits.length ? "I've proposed the changes below — please review them." : "Done."),
      edits,
      model: response.model,
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: "rate_limited" }, 429);
    if (error instanceof Anthropic.AuthenticationError) return json({ error: "bad_key" }, 503);
    if (error instanceof Anthropic.BadRequestError) return json({ error: "bad_request", detail: error.message }, 502);
    if (error instanceof Anthropic.APIError) return json({ error: "upstream", status: error.status }, 502);
    return json({ error: "unknown" }, 500);
  }
};

export const config = { path: "/api/assistant" };
