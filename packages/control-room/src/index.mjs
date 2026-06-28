// M3 — the Control Room. One oversight surface, scoped by identity.
//   steward  → everything + the global kill switch + export
//   auditor  → everything, read-only + export (evidence / DSAR)
//   developer→ all gate decisions (health), no kill, no export
//   policy-author / member → only their OWN effects
// Fail-closed: an unknown role sees nothing.
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

const SCOPE = {
  steward: { all: true, canKill: true, canExport: true },
  auditor: { all: true, canKill: false, canExport: true },
  developer: { all: true, canKill: false, canExport: false },
  "policy-author": { all: false, canKill: false, canExport: false },
  member: { all: false, canKill: false, canExport: false },
};

export const canKill = (role) => SCOPE[role]?.canKill === true;

export class Ledger {
  constructor() { this.records = []; this.killed = false; }

  record({ actor, action = "decide", status, gate = null, citations = [], at = new Date().toISOString() }) {
    const r = { id: randomUUID(), actor, action, status, gate, citations, at };
    this.records.push(r);
    return r;
  }

  kill(role) {
    if (!canKill(role)) throw new Error("only a steward may use the kill switch");
    this.killed = true;
    return this.record({ actor: role, action: "kill-switch", status: "KILLED" });
  }

  revive(role) {
    if (!canKill(role)) throw new Error("only a steward may revive");
    this.killed = false;
    return this.record({ actor: role, action: "revive", status: "LIVE" });
  }
}

/** The role-scoped view of the ledger. */
export function view(ledger, { role, actor } = {}) {
  const scope = SCOPE[role];
  if (!scope) return { role: role ?? null, killed: ledger.killed, canKill: false, canExport: false, count: 0, records: [] }; // fail-closed
  const records = scope.all ? ledger.records : ledger.records.filter((r) => r.actor === actor);
  return { role, killed: ledger.killed, canKill: scope.canKill, canExport: scope.canExport, count: records.length, records };
}

// --- pure router (testable without a socket) --------------------------------
export function route(method, path, ctx, ledger) {
  if (method === "GET" && (path === "/" || path === "")) {
    return { status: 200, type: "text/html", body: dashboardHTML() };
  }
  if (method === "GET" && path === "/api/oversight") {
    return { status: 200, type: "application/json", body: JSON.stringify(view(ledger, ctx)) };
  }
  if (method === "POST" && path === "/api/kill") {
    if (!canKill(ctx.role)) return { status: 403, type: "application/json", body: JSON.stringify({ error: "forbidden" }) };
    ledger.kill(ctx.role);
    return { status: 200, type: "application/json", body: JSON.stringify({ killed: true }) };
  }
  return { status: 404, type: "application/json", body: JSON.stringify({ error: "not found" }) };
}

/** Start the dashboard server. identity(req) → { role, actor } (default reads ?role=&actor=). */
export function serve({ port = 0, ledger = new Ledger(), identify } = {}) {
  const id = identify || ((url) => ({ role: url.searchParams.get("role"), actor: url.searchParams.get("actor") }));
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const out = route(req.method, url.pathname, id(url, req), ledger);
    res.writeHead(out.status, { "content-type": out.type });
    res.end(out.body);
  });
  server.listen(port);
  return server;
}

function dashboardHTML() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/><title>AiGovOps · Control Room</title>
<style>
  body{margin:0;background:#070b16;color:#e8edf7;font:14px/1.6 ui-monospace,Menlo,monospace}
  header{padding:16px 22px;border-bottom:1px solid rgba(255,255,255,.1);display:flex;gap:14px;align-items:center;flex-wrap:wrap}
  .dot{width:10px;height:10px;border-radius:50%;background:#39d0c3;box-shadow:0 0 14px #39d0c3}
  h1{font-size:16px;margin:0;font-family:Georgia,serif}
  select,button{background:#0c1430;color:#e8edf7;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:7px 11px;font:inherit}
  .kill{margin-left:auto;border-color:#ff7a8a;color:#ff7a8a}
  main{padding:22px;max-width:980px;margin:0 auto}
  .meta{color:#9aa6c2;margin-bottom:14px}
  table{width:100%;border-collapse:collapse}
  th,td{text-align:left;padding:9px 10px;border-bottom:1px solid rgba(255,255,255,.07);font-size:13px}
  th{color:#39d0c3;text-transform:uppercase;letter-spacing:.08em;font-size:11px}
  .PASS{color:#57e08a}.FAIL{color:#ff7a8a}.KILLED{color:#ff7a8a}
  .banner{background:rgba(255,122,138,.15);border:1px solid #ff7a8a;border-radius:10px;padding:10px 14px;margin-bottom:14px;display:none}
</style></head><body>
<header><span class="dot"></span><h1>AiGovOps · Control Room</h1>
  <label>view as <select id="role">
    <option value="steward">steward</option><option value="developer">developer</option>
    <option value="policy-author">policy-author</option><option value="member">member</option>
    <option value="auditor">auditor</option></select></label>
  <input id="actor" placeholder="actor id" value="jeeves"
    style="background:#0c1430;color:#e8edf7;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:7px 11px"/>
  <button class="kill" id="kill">⨯ kill switch</button>
</header>
<main>
  <div class="banner" id="banner">⨯ Global kill switch is ENGAGED — all effects paused.</div>
  <div class="meta" id="meta">loading…</div>
  <table><thead><tr><th>when</th><th>actor</th><th>action</th><th>status</th><th>citations</th></tr></thead>
  <tbody id="rows"></tbody></table>
</main>
<script>
  const $=s=>document.querySelector(s);
  async function load(){
    const role=$('#role').value, actor=$('#actor').value;
    const v=await (await fetch('/api/oversight?role='+role+'&actor='+encodeURIComponent(actor))).json();
    $('#banner').style.display=v.killed?'block':'none';
    $('#kill').style.display=v.canKill?'inline-block':'none';
    $('#meta').textContent=v.count+' record(s) visible to '+v.role+(v.canExport?' · export enabled':'');
    $('#rows').innerHTML=v.records.map(r=>'<tr><td>'+r.at+'</td><td>'+r.actor+'</td><td>'+r.action+
      '</td><td class="'+r.status+'">'+r.status+'</td><td>'+(r.citations||[]).join(', ')+'</td></tr>').join('')
      || '<tr><td colspan="5" style="color:#9aa6c2">no records visible at this role</td></tr>';
  }
  $('#role').onchange=load; $('#actor').onchange=load;
  $('#kill').onclick=async()=>{ await fetch('/api/kill',{method:'POST',headers:{},
    body:''}).catch(()=>{}); load(); };
  // kill needs role in query for this demo identity
  $('#kill').onclick=async()=>{ await fetch('/api/kill?role='+$('#role').value,{method:'POST'}); load(); };
  load();
</script></body></html>`;
}
