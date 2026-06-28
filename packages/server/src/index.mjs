// M9 — HTTP server (node:http) + the GateClient SDK. Zero-dependency.
import { createServer } from "node:http";
import { handle } from "./api.mjs";

export { handle, OPENAPI } from "./api.mjs";

/** Start the gate service. Returns the node:http server (listening on `port`, 0 = ephemeral). */
export function serve({ port = 0 } = {}) {
  const server = createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let body = null;
    try { body = raw ? JSON.parse(raw) : null; } catch { /* leave null */ }
    const url = new URL(req.url, "http://localhost");
    const out = await handle({ method: req.method, path: url.pathname, body });
    if (out.html != null) {
      res.writeHead(out.status, { "content-type": "text/html; charset=utf-8" });
      res.end(out.html);
    } else if (out.text != null) {
      res.writeHead(out.status, { "content-type": "text/plain; version=0.0.4" });
      res.end(out.text);
    } else {
      res.writeHead(out.status, { "content-type": "application/json" });
      res.end(JSON.stringify(out.json));
    }
  });
  server.listen(port);
  return server;
}

/** The reference SDK client — the wire contract every language SDK implements. */
export class GateClient {
  constructor({ baseUrl, fetchImpl = globalThis.fetch } = {}) {
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl;
  }
  async _post(path, body) {
    const r = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    return r.json();
  }
  decide(proposal) { return this._post("/v1/decide", proposal); }
  improve(policyText, context) { return this._post("/v1/improve", { policyText, context }); }
  author(policyText, context) { return this._post("/v1/author", { policyText, context }); }
  compare(args) { return this._post("/v1/compare", args); }
}
