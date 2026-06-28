// M21 — the served Approvals console. The delightful approval flow (M19/M20), backed by a LIVE
// OpsAgent in the gate process: real Approve buttons advance the real state machine. The agent
// auto-runs every reversible step and stops at the four human gates. Credentials are shown as
// 1Password chips (resolved by the runbook at execution time; the console drives the approvals).
import { opsPlan, OpsAgent, prepareStep } from "../../ops-agent/src/index.mjs";

let agent, lastRun;

function fresh() {
  const plan = opsPlan({ host: "vps", domain: "app.aigovops.org", desktop: true, saas: true, npm: true });
  const executors = Object.fromEntries(plan.steps.map((s) => [s.id, () => ({ ok: true })]));
  agent = new OpsAgent({ plan, executors });
  lastRun = null;
}
fresh();

function view() {
  const done = new Set((lastRun?.completed || []).map((c) => c.id));
  const gate = lastRun?.status === "blocked" ? lastRun.at : null;
  const steps = agent.plan.steps.map((s) => ({
    id: s.id, title: s.title, kind: s.kind, milestone: s.milestone, needs: s.needs || [],
    detail: s.detail, humanAction: s.humanAction,
    status: done.has(s.id) ? "done" : s.id === gate ? "active" : "pending",
    prepared: prepareStep(s, { domain: "app.aigovops.org" }), // M22 — everything staged ahead of the gate
  }));
  const gates = steps.filter((s) => s.kind === "gate");
  return {
    steps, gate, complete: lastRun?.status === "complete",
    progress: { done: done.size, total: steps.length },
    gateProgress: { approved: gates.filter((g) => g.status === "done").length, total: gates.length },
  };
}

export async function opsState() { if (!lastRun) lastRun = await agent.run(); return view(); }
export async function opsApprove(id) { agent.approve(id); lastRun = await agent.run(); return view(); }
export async function opsReset() { fresh(); lastRun = await agent.run(); return view(); }

export function opsConsoleHTML() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AiGovOps — Go-live approvals</title>
<style>
  :root{--bg:#0b0f17;--panel:#121826;--panel2:#0f1420;--line:#222c3f;--ink:#e8eef6;--mut:#9fb0c6;--teal:#1dd3a7;--accent:#4aa3ff;--ok:#1dd3a7}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  .wrap{max-width:720px;margin:0 auto;padding:28px 20px 60px}
  h1{font-size:20px;font-weight:600;margin:0;display:flex;align-items:center;gap:9px}
  .sub{color:var(--mut);font-size:13px;margin:4px 0 18px}
  .bar{height:7px;background:var(--panel);border-radius:999px;overflow:hidden}
  .bar > i{display:block;height:100%;width:0;background:var(--teal);transition:width .6s ease}
  .meta{display:flex;justify-content:space-between;color:var(--mut);font-size:13px;margin:8px 2px 6px}
  .step{display:flex;gap:13px;align-items:flex-start;padding:13px 2px;border-top:1px solid var(--line)}
  .step:first-of-type{border-top:none}
  .dot{flex:0 0 34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--panel);border:1px solid var(--line);color:var(--mut);font-size:15px}
  .step.done .dot{background:rgba(29,211,167,.14);border-color:var(--teal);color:var(--teal)}
  .step.active{background:var(--panel);border:2px solid var(--accent);border-radius:14px;padding:15px}
  .step.active .dot{background:rgba(74,163,255,.14);border-color:var(--accent);color:var(--accent)}
  .step.pending{opacity:.5}
  .t{font-weight:600}.d{color:var(--mut);font-size:13px}
  .who{font-size:11px;color:var(--mut);padding-top:8px;white-space:nowrap}
  .cred{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--mut);background:var(--panel2);border:1px solid var(--line);border-radius:7px;padding:2px 8px;margin:6px 6px 0 0}
  .act{font-size:13px;color:var(--mut);margin:9px 0 0}
  .mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--mut);background:var(--panel2);border:1px solid var(--line);border-radius:7px;padding:5px 9px;margin-top:7px;overflow-x:auto;white-space:nowrap}
  .rdy{font-size:10px;color:var(--teal);margin-top:3px;text-transform:uppercase;letter-spacing:.06em}
  .open{display:inline-block;margin:11px 10px 0 0;text-decoration:none;color:var(--mut);border:1px solid var(--line);border-radius:9px;padding:9px 14px;font-size:14px}
  .open:hover{border-color:var(--accent);color:var(--ink)}
  button{margin-top:11px;background:var(--accent);color:#04121f;border:none;border-radius:9px;padding:10px 18px;font-weight:600;font-size:14px;cursor:pointer}
  button:hover{filter:brightness(1.07)}button.ghost{background:transparent;color:var(--mut);border:1px solid var(--line);font-weight:500}
  .done-card{margin-top:16px;text-align:center;background:rgba(29,211,167,.1);border:1px solid var(--teal);border-radius:14px;padding:24px}
  .done-card .big{font-size:20px;font-weight:600;color:var(--teal);margin:8px 0 2px}
  svg.ic{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  canvas{position:fixed;inset:0;pointer-events:none}
</style></head><body>
<canvas id="cf"></canvas>
<div class="wrap">
  <h1><svg class="ic" viewBox="0 0 24 24"><path d="M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7z"/><path d="M9 12l2 2 4-4"/></svg> Go-live approvals</h1>
  <div class="sub">Every step is engineered and staged — the exact command, the prefilled config, the precise values. Four approvals are yours; the agent did the rest. Credentials come from 1Password, never pasted.</div>
  <div class="meta"><span id="gatecount">—</span><span id="count">—</span></div>
  <div class="bar"><i id="fill"></i></div>
  <div id="list" style="margin-top:8px"></div>
  <div id="done"></div>
  <div style="margin-top:18px"><button class="ghost" onclick="reset()">Reset demo</button></div>
</div>
<script>
const CHK='<svg class="ic" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>';
const ICON={'registry-public':'M12 3v12M8 7l4-4 4 4M5 21h14','provision':'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01','deploy':'M12 19V5M5 12l7-7 7 7','desktop-build':'M3 7h18v12H3zM3 7l3-4h12l3 4','desktop-sign':'M12 15a4 4 0 100-8 4 4 0 000 8zM12 15v6l-2-2-2 2','stripe-wire':'M3 7h18v10H3zM3 11h18','npm-publish':'M4 4h16v16H4zM10 8v8M14 8v8','dns':'M12 3a9 9 0 100 18 9 9 0 000-18M3 12h18M12 3c3 3 3 15 0 18','golive':'M12 3c3 4 3 9 0 13-3-4-3-9 0-13zM9 13l-3 5 5-3M15 13l3 5-5-3','observability':'M4 19V5M4 15l5-5 4 4 7-7'};
function svg(d){return '<svg class="ic" viewBox="0 0 24 24"><path d="'+d+'"/></svg>'}
function render(s){
  document.getElementById('gatecount').textContent = s.gateProgress.approved>=s.gateProgress.total?'All gates approved':('Gate '+(s.gateProgress.approved+1)+' of '+s.gateProgress.total);
  document.getElementById('count').textContent = s.progress.done+' of '+s.progress.total+' steps';
  document.getElementById('fill').style.width = Math.round(s.progress.done/s.progress.total*100)+'%';
  const list=document.getElementById('list'); list.innerHTML='';
  s.steps.forEach(st=>{
    const el=document.createElement('div'); el.className='step '+st.status;
    const creds=(st.needs||[]).map(c=>'<span class="cred"><svg class="ic" viewBox="0 0 24 24"><path d="M12 11V7a4 4 0 00-8 0M5 11h14v9H5z"/></svg>1Password · '+c+'</span>').join('');
    const p=st.prepared||{};
    let staged='';
    if(st.status!=='done'){
      if(p.command) staged+='<div class="mono">'+p.command+'</div>';
      if(p.record) staged+='<div class="mono" style="color:var(--teal)">A   '+p.record.name+'   →   '+p.record.value+'   (TTL '+p.record.ttl+')</div>';
      if(p.preflight) staged+='<div class="mono">preflight · '+p.preflight.join(' · ')+'</div>';
    }
    let gateUI='';
    if(st.status==='active'){
      const link=p.link?'<a href="'+p.link+'" target="_blank" class="open">Open the exact page</a>':'';
      gateUI='<div class="act">'+(st.humanAction||'')+'</div>'+link+'<button onclick="approve(\\''+st.id+'\\')">Approve and continue</button>';
    }
    el.innerHTML='<div class="dot">'+(st.status==='done'?CHK:svg(ICON[st.id]||'M12 6v12'))+'</div>'+
      '<div style="flex:1;min-width:0"><div class="t">'+st.title+'</div><div class="d">'+st.detail+'</div>'+creds+staged+gateUI+
      '</div><div class="who">'+(st.kind==='gate'?'you':'agent')+(st.status!=='done'?'<div class="rdy">ready</div>':'')+'</div>';
    list.appendChild(el);
  });
  const d=document.getElementById('done');
  d.innerHTML = s.complete ? '<div class="done-card"><svg class="ic" viewBox="0 0 24 24" style="width:30px;height:30px;color:var(--teal)"><path d="M12 3c3 4 3 9 0 13-3-4-3-9 0-13zM9 13l-3 5 5-3M15 13l3 5-5-3"/></svg><div class="big">You\\u2019re live</div><div class="d">app.aigovops.org is serving the governed gate. Four approvals — the agent did the rest.</div></div>' : '';
  if(s.complete) confetti();
}
async function load(){ render(await (await fetch('/v1/ops/state')).json()); }
async function approve(id){ render(await (await fetch('/v1/ops/approve',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id})})).json()); }
async function reset(){ render(await (await fetch('/v1/ops/reset',{method:'POST'})).json()); }
let fired=false;
function confetti(){ if(fired)return; fired=true; const c=document.getElementById('cf');c.width=innerWidth;c.height=innerHeight;const x=c.getContext('2d');const C=['#1dd3a7','#4aa3ff','#efb44a','#e36b9b'];
  const P=[];for(let k=0;k<150;k++)P.push({x:innerWidth/2,y:innerHeight*0.3,vx:(Math.random()-.5)*10,vy:Math.random()*-9-2,c:C[k%4],s:Math.random()*5+3,a:1});
  let t=0;(function fr(){x.clearRect(0,0,c.width,c.height);P.forEach(o=>{o.vy+=.24;o.x+=o.vx;o.y+=o.vy;o.a-=.008;x.globalAlpha=Math.max(0,o.a);x.fillStyle=o.c;x.fillRect(o.x,o.y,o.s,o.s)});t++;if(t<180)requestAnimationFrame(fr);else x.clearRect(0,0,c.width,c.height)})();}
load();
</script></body></html>`;
}
