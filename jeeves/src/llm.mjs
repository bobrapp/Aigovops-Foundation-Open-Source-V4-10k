// The LLM client interface for Jeeves' conversational layer.
//
// Two implementations behind one contract (define once; strongest backend each env allows):
//   HeuristicLLM  — deterministic, offline, zero-dep. Runs in tests and air-gapped labs.
//   AnthropicLLM  — real Claude (claude-opus-4-8) via raw fetch to the Messages API, so the
//                   core stays zero-dependency. Drop in @anthropic-ai/sdk if you prefer.
//
// Contract:
//   extractContext(utterance) → { sector?, jurisdiction?, dataTypes?, riskTier? }
//   narrate({ system, prompt }) → string

const has = (t, ...words) => words.some((w) => t.includes(w));

// --- offline, deterministic default -----------------------------------------
export class HeuristicLLM {
  name = "heuristic";

  async extractContext(utterance) {
    const t = String(utterance).toLowerCase();
    const ctx = { dataTypes: [] };
    if (has(t, "school", "student", "education", "tutor", "faculty", "campus")) { ctx.sector = "education"; ctx.dataTypes.push("children", "personal"); }
    else if (has(t, "health", "patient", "hospital", "clinical", "phi")) { ctx.sector = "healthcare"; ctx.dataTypes.push("health", "personal"); }
    else if (has(t, "hiring", "employment", "candidate", "applicant", "hr ")) { ctx.sector = "employment"; ctx.dataTypes.push("personal"); }
    if (has(t, "eu", "gdpr", "europe", "european")) ctx.jurisdiction = "EU";
    else if (has(t, "colorado")) ctx.jurisdiction = "US-CO";
    else if (has(t, "nyc", "new york city")) ctx.jurisdiction = "US-NYC";
    else if (has(t, "us", "united states", "america")) ctx.jurisdiction = "US";
    if (has(t, "personal data", "pii", "customer data", "user data")) ctx.dataTypes.push("personal");
    if (has(t, "high-risk", "high risk", "consequential", "significant")) ctx.riskTier = "high";
    ctx.dataTypes = [...new Set(ctx.dataTypes)];
    return ctx;
  }

  // Deterministic, grounded narration: returns the cited brief it was handed, unchanged.
  async narrate({ prompt }) {
    return prompt;
  }
}

// --- real Claude via raw fetch (zero added dependency) ----------------------
export class AnthropicLLM {
  name = "anthropic";
  constructor({ apiKey = process.env.ANTHROPIC_API_KEY, model = "claude-opus-4-8", fetchImpl = globalThis.fetch, maxTokens = 1024 } = {}) {
    Object.assign(this, { apiKey, model, fetchImpl, maxTokens });
  }

  async _message({ system, prompt, outputSchema }) {
    const body = {
      model: this.model,
      max_tokens: this.maxTokens,
      thinking: { type: "adaptive" }, // 4.8 surface: adaptive only; no budget_tokens / sampling params
      system,
      messages: [{ role: "user", content: prompt }],
    };
    if (outputSchema) body.output_config = { format: { type: "json_schema", schema: outputSchema } };
    const res = await this.fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": this.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (json.stop_reason === "refusal") throw new Error("claude declined the request");
    return (json.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  }

  async extractContext(utterance) {
    const schema = {
      type: "object", additionalProperties: false,
      properties: {
        sector: { type: "string" }, jurisdiction: { type: "string" },
        dataTypes: { type: "array", items: { type: "string" } }, riskTier: { type: "string" },
      },
    };
    const text = await this._message({
      system: "Extract the AI-governance context from the user's description. Reply with ONLY the JSON object.",
      prompt: utterance,
      outputSchema: schema,
    });
    try { return JSON.parse(text); } catch { return new HeuristicLLM().extractContext(utterance); }
  }

  async narrate({ system, prompt }) {
    return this._message({ system, prompt });
  }
}
