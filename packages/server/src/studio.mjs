// M9 — the Studio UX, served at "/". Self-contained, zero-dependency single-page app for the two
// protagonists: a policy author (improve a written policy → cited gaps) and a developer (author
// runnable gates → prove governed vs ungoverned → sign evidence). It calls the same gate API and
// surfaces each version's production capability: M6 attestation, M7 drift, M8 profiles, M9 platform.
//
// The inner <script> uses string concatenation only (no template literals) so this whole document
// can live inside one outer template literal without escaping gymnastics.

export function studioHTML() {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>AiGovOps Studio</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<style>
  :root{--bg:#070b16;--panel:#0c1430;--panel2:#0f1838;--ink:#e8edf7;--muted:#9aa6c2;--line:rgba(255,255,255,.10);
    --teal:#39d0c3;--green:#57e08a;--gold:#e7c069;--rose:#ff7a8a;--display:"Fraunces",Georgia,serif;--mono:"DM Mono",ui-monospace,Menlo,monospace}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--mono);line-height:1.6;
    background-image:radial-gradient(900px 500px at 85% -10%,rgba(57,208,195,.10),transparent 60%),linear-gradient(transparent 95%,rgba(255,255,255,.025) 95%),linear-gradient(90deg,transparent 95%,rgba(255,255,255,.025) 95%);background-size:auto,44px 44px,44px 44px}
  a{color:var(--teal);text-decoration:none}h1,h2,h3{font-family:var(--display);font-weight:600;letter-spacing:-.01em}
  header{position:sticky;top:0;z-index:9;background:rgba(7,11,22,.85);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);padding:14px 24px;display:flex;gap:18px;align-items:center;flex-wrap:wrap}
  .brand{display:flex;gap:10px;align-items:center;font-family:var(--display);font-weight:700;font-size:18px}
  .dot{width:11px;height:11px;border-radius:50%;background:var(--teal);box-shadow:0 0 16px var(--teal)}
  nav a{color:var(--muted);margin-left:16px;font-size:13.5px}nav a:hover{color:var(--ink)}
  .wrap{max-width:1000px;margin:0 auto;padding:26px 24px 80px}
  section{border-top:1px solid var(--line);padding:30px 0}
  .step{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--teal)}
  h2{font-size:clamp(22px,3.4vw,30px);margin:.25em 0 .15em}
  .sub{color:var(--muted);max-width:680px;font-size:14.5px}
  label{display:block;font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin:0 0 5px}
  select,input,textarea,button{font:inherit;background:var(--panel2);color:var(--ink);border:1px solid var(--line);border-radius:9px;padding:9px 11px}
  textarea{width:100%;min-height:90px;resize:vertical}
  .row{display:flex;gap:12px;flex-wrap:wrap;margin:14px 0}.row>div{flex:1;min-width:140px}
  button.go{background:linear-gradient(180deg,var(--teal),#27a89d);color:#04201d;border:none;font-weight:600;cursor:pointer;padding:11px 18px;margin-top:12px}
  button.go:hover{filter:brightness(1.07)}button.ghost{cursor:pointer}button.ghost:hover{border-color:var(--teal);color:var(--teal)}
  .card{background:linear-gradient(180deg,var(--panel),var(--panel2));border:1px solid var(--line);border-radius:13px;padding:16px;margin:10px 0}
  .pill{display:inline-block;font-size:11px;padding:3px 9px;border-radius:999px;border:1px solid var(--line)}
  .PASS{color:var(--green)}.FAIL{color:var(--rose)}.badge{font-family:var(--display);font-weight:700;font-size:20px;padding:5px 14px;border-radius:9px}
  .pass-bg{background:rgba(87,224,138,.15)}.fail-bg{background:rgba(255,122,138,.15)}
  .cite{color:var(--gold);font-size:12.5px}.mut{color:var(--muted)}.mono{font-size:12.5px}
  table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:8px 9px;border-bottom:1px solid rgba(255,255,255,.07);vertical-align:top}
  th{color:var(--teal);text-transform:uppercase;letter-spacing:.06em;font-size:11px}
  pre{background:#05080f;border:1px solid var(--line);border-radius:10px;padding:13px;overflow:auto;font-size:12.5px;color:#cdd7ee}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:680px){.two{grid-template-columns:1fr}}
  .meter{height:8px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;margin:6px 0}.meter>i{display:block;height:100%;background:linear-gradient(90deg,var(--rose),var(--gold),var(--green))}
  .chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.chip{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-size:12.5px}
  .chip b{color:var(--teal);font-family:var(--display)}
</style></head><body>
<header><div class="brand"><span class="dot"></span> AiGovOps&nbsp;Studio</div>
  <nav><a href="#author">Author</a><a href="#build">Build</a><a href="#evidence">Evidence</a><a href="#monitor">Monitor</a><a href="#platform">Platform</a></nav>
  <span id="health" class="pill mut" style="margin-left:auto">checking…</span></header>
<div class="wrap">

  <section id="author" style="border-top:none">
    <div class="step">For policy folks</div>
    <h2>1 · Improve a written policy</h2>
    <p class="sub">Tell us the context, paste your policy in plain prose, and get a cited gap analysis against the live regulatory corpus — or start from a regulation.</p>
    <div class="row">
      <div><label>Sector</label><select id="sector"><option value="">(any)</option><option>education</option><option>healthcare</option><option>employment</option></select></div>
      <div><label>Jurisdiction</label><select id="jur"><option value="">(any)</option><option>EU</option><option>US</option><option>US-CO</option><option>US-NYC</option></select></div>
      <div><label>Risk tier</label><select id="risk"><option value="">(any)</option><option>high</option><option>limited</option><option>minimal</option></select></div>
      <div><label>Data types</label><input id="data" value="personal,children" placeholder="personal,children"/></div>
    </div>
    <div class="row"><div style="flex:2"><label>Start from a regulation (optional)</label><select id="profile"><option value="">— pick a framework —</option></select></div>
      <div style="align-self:end"><button class="ghost" id="btn-profile">Load profile gates</button></div></div>
    <label>Your written policy</label>
    <textarea id="policy">Our school uses an AI tutor. We tell students it is AI and teachers can review its suggestions.</textarea>
    <button class="go" id="btn-improve">Improve my policy →</button>
    <div id="improve-out"></div>
  </section>

  <section id="build">
    <div class="step">For code folks</div>
    <h2>2 · Author the gates &amp; prove them</h2>
    <p class="sub">Turn the gaps into runnable gates (each with Get / Stay / Recover exit states), then run a request governed vs. ungoverned to see exactly what governance catches.</p>
    <button class="go" id="btn-author">Author the gates →</button>
    <div id="author-out"></div>
    <label style="margin-top:16px">Request payload (JSON)</label>
    <textarea id="payload">{ "model": "gpt-4" }</textarea>
    <button class="go" id="btn-compare">Run governed vs. ungoverned →</button>
    <div id="compare-out"></div>
  </section>

  <section id="evidence">
    <div class="step">Beacon · M6</div>
    <h2>3 · Evidence &amp; attestation</h2>
    <p class="sub">A passing run is signed. Turn the receipt into an in-toto / SLSA attestation in a DSSE envelope — the format Sigstore/cosign and in-toto verifiers consume — and verify it offline.</p>
    <div id="receipt-out" class="mut">Run a compliant request in step 2 to produce a signed receipt.</div>
    <button class="go" id="btn-attest" style="display:none">Create attestation →</button>
    <div id="attest-out"></div>
  </section>

  <section id="monitor">
    <div class="step">Lantern · M7</div>
    <h2>4 · Drift monitoring</h2>
    <p class="sub">Stay at YES: catch a shifted distribution even when every value is still in range. Enter two numeric samples (comma-separated).</p>
    <div class="row">
      <div><label>Baseline sample</label><input id="base" value="1,2,3,4,5,6,7,8,9,10"/></div>
      <div><label>Current sample</label><input id="cur" value="8,9,10,11,12,13,14,15,16,17"/></div>
      <div style="max-width:120px"><label>Method</label><select id="method"><option value="psi">PSI</option><option value="ks">KS</option><option value="kl">KL</option></select></div>
    </div>
    <button class="go" id="btn-drift">Check drift →</button>
    <div id="drift-out"></div>
  </section>

  <section id="platform">
    <div class="step">Platform · M9</div>
    <h2>5 · Production approaches, by version</h2>
    <p class="sub">Everything above is one HTTP API behind a swappable Apache-2.0 backend per environment. Each release made a product production-shaped:</p>
    <div class="chips">
      <div class="chip"><b>M6 Beacon</b> — hash-chained ledger · key rotation · in-toto/SLSA · MLflow</div>
      <div class="chip"><b>M7 Lantern</b> — PSI/KL/KS drift · Great-Expectations gates · Alertmanager</div>
      <div class="chip"><b>M8 Umbrella</b> — framework profiles · Casbin authz · Kyverno · Trivy/ZAP/Semgrep</div>
      <div class="chip"><b>M9 Platform</b> — gate-as-a-service · persistence · gVisor sandbox · conformance</div>
    </div>
    <div id="conf-out" style="margin-top:14px" class="mut">checking conformance…</div>
    <p class="sub" style="margin-top:14px">Call it from any language:</p>
    <pre>curl -XPOST $ORIGIN/v1/decide -d '{"profile":"baseline","payload":{"model":"claude-opus-4-8","humanApproved":true}}'

import { GateClient } from "@aigovops/server";
const gate = new GateClient({ baseUrl: "$ORIGIN" });
await gate.improve(writtenPolicy, context);   // policy folks
await gate.author(writtenPolicy, context);    // code folks → runnable gates</pre>
  </section>
</div>

<script>
(function(){
  var API = location.origin;
  var S = { context:{}, report:null, authored:null, receipt:null, publicKey:null };
  function $(s){ return document.querySelector(s); }
  function esc(s){ return String(s==null?"":s).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];}); }
  function post(p,b){ return fetch(API+p,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b||{})}).then(function(r){return r.json();}); }
  function get(p){ return fetch(API+p).then(function(r){return r.json();}); }
  function nums(s){ return String(s).split(",").map(function(x){return parseFloat(x.trim());}).filter(function(x){return !isNaN(x);}); }
  function ctx(){ S.context={ sector:$("#sector").value||undefined, jurisdiction:$("#jur").value||undefined, riskTier:$("#risk").value||undefined, dataTypes:$("#data").value.split(",").map(function(s){return s.trim();}).filter(Boolean) }; return S.context; }

  get("/healthz").then(function(h){ $("#health").textContent="● "+(h.ok?"gate online v"+h.version:"offline"); $("#health").style.color=h.ok?"var(--green)":"var(--rose)"; });
  document.querySelectorAll("pre").forEach(function(p){ p.innerHTML=p.innerHTML.split("$ORIGIN").join(API); });

  function loadProfiles(){ post("/v1/profiles",{context:ctx()}).then(function(r){ var sel=$("#profile"); sel.innerHTML='<option value="">— pick a framework —</option>'; (r.frameworks||[]).forEach(function(f){ var o=document.createElement("option"); o.value=f; o.textContent=f; sel.appendChild(o); }); }); }
  ["#sector","#jur","#risk","#data"].forEach(function(id){ $(id).addEventListener("change", loadProfiles); }); loadProfiles();

  $("#btn-profile").onclick=function(){ var f=$("#profile").value; if(!f){return;} post("/v1/profile",{framework:f,context:ctx()}).then(function(p){ if(p.error){ $("#improve-out").innerHTML='<div class="card FAIL">'+esc(p.error)+'</div>'; return; } S.authored={policy:p.policy,citations:p.citations,exitStates:{}}; renderGates(p.policy, p.citations, "#improve-out", f+" — starter gates from the regulation"); }); };

  $("#btn-improve").onclick=function(){ var out=$("#improve-out"); out.innerHTML='<div class="mut">analyzing…</div>'; post("/v1/improve",{policyText:$("#policy").value,context:ctx()}).then(function(r){ S.report=r; renderImprove(r); }); };
  function renderImprove(r){ var pct=Math.round((r.coverageScore||0)*100); var h='<div class="card"><b>Coverage</b> — '+r.strengths.length+'/'+r.applicableCount+' applicable requirements ('+pct+'%)<div class="meter"><i style="width:'+pct+'%"></i></div></div>'; h+='<h3 style="margin:16px 0 6px">Gaps to close ('+r.gaps.length+')</h3>'; r.gaps.forEach(function(g){ h+='<div class="card"><span class="pill FAIL">'+esc(g.status)+'</span> <b>'+esc(g.framework)+' — '+esc(g.title)+'</b><div class="cite">'+esc(g.citation)+'</div><div class="mut" style="margin:6px 0">'+esc(g.why)+'</div><div><b>Add:</b> '+esc(g.suggestedClause)+'</div>'+(g.suggestedGate?'<div class="mono cite">candidate gate: '+esc(JSON.stringify(g.suggestedGate))+'</div>':'')+'</div>'; }); $("#improve-out").innerHTML=h; }

  $("#btn-author").onclick=function(){ var out=$("#author-out"); out.innerHTML='<div class="mut">authoring…</div>'; post("/v1/author",{policyText:$("#policy").value,context:ctx()}).then(function(a){ if(a.error){out.innerHTML='<div class="card FAIL">'+esc(a.error)+'</div>';return;} S.authored=a; renderGates(a.policy,a.citations,"#author-out","Authored gates",a.exitStates); $("#payload").value=JSON.stringify(compliant(a.policy),null,2); }); };
  function renderGates(policy,citations,sel,title,exits){ var h='<h3 style="margin:14px 0 6px">'+esc(title)+' ('+policy.rules.length+')</h3><table><thead><tr><th>Gate</th><th>Citation</th><th>Get / Stay / Recover</th></tr></thead><tbody>'; policy.rules.forEach(function(r){ var ex=exits&&exits[r.path]; var c=(citations&&citations[r.path])||[]; h+='<tr><td class="mono">'+esc(r.path)+' '+esc(r.op)+(r.value!==undefined?" "+esc(JSON.stringify(r.value)):"")+'</td><td class="cite">'+esc([].concat(c).join(" · "))+'</td><td class="mut">'+(ex?esc(ex.getToYes)+'<br>'+esc(ex.stayAtYes)+'<br>'+esc(ex.recoverToYes):esc(r.message||""))+'</td></tr>'; }); h+='</tbody></table>'; $(sel).innerHTML=h; }

  $("#btn-compare").onclick=function(){ if(!S.authored){ $("#compare-out").innerHTML='<div class="card mut">Author the gates first.</div>'; return; } var payload; try{ payload=JSON.parse($("#payload").value); }catch(e){ $("#compare-out").innerHTML='<div class="card FAIL">Invalid JSON payload.</div>'; return; } post("/v1/compare",{payload:payload,authored:S.authored}).then(function(c){ renderCompare(c); }); };
  function renderCompare(c){ var g=c.governed; var blocks=(g.blockedBy||[]).map(function(b){return '<div class="cite">• '+esc([].concat(b.citations).join(" · "))+' — '+esc(b.recoverToYes)+'</div>';}).join(""); var h='<div class="two"><div class="card"><div class="step">Ungoverned</div><div class="badge pass-bg PASS">RAN</div><div class="mut" style="margin-top:8px">'+esc(c.ungoverned.note)+'</div></div><div class="card '+(g.proceeded?"":"")+'"><div class="step">Governed</div><div class="badge '+(g.proceeded?"pass-bg PASS":"fail-bg FAIL")+'">'+esc(g.status)+'</div>'+(g.proceeded?'<div class="mut" style="margin-top:8px">Allowed — a signed receipt was issued.</div>':'<div style="margin-top:8px">Blocked by '+g.blockedBy.length+' clause(s):</div>'+blocks)+'</div></div>'; $("#compare-out").innerHTML=h; if(g.receipt){ S.receipt=g.receipt; S.publicKey=g.publicKey; showReceipt(); } }

  function showReceipt(){ $("#receipt-out").innerHTML='<div class="card"><span class="pill PASS">signed · ed25519</span><pre>'+esc(JSON.stringify(S.receipt,null,2))+'</pre></div>'; $("#btn-attest").style.display="inline-block"; }
  $("#btn-attest").onclick=function(){ post("/v1/attest",{receipt:S.receipt}).then(function(a){ if(a.error){$("#attest-out").innerHTML='<div class="card FAIL">'+esc(a.error)+'</div>';return;} $("#attest-out").innerHTML='<div class="card"><span class="pill '+(a.verified?"PASS":"FAIL")+'">DSSE '+(a.verified?"verified offline":"invalid")+'</span> <span class="pill mut">in-toto + SLSA</span><pre>'+esc(JSON.stringify({payloadType:a.envelope.payloadType,statementType:a.statement._type,predicateType:a.statement.predicateType,subject:a.statement.subject},null,2))+'</pre></div>'; }); };

  $("#btn-drift").onclick=function(){ post("/v1/drift",{baseline:nums($("#base").value),current:nums($("#cur").value),method:$("#method").value}).then(function(d){ if(d.error){$("#drift-out").innerHTML='<div class="card FAIL">'+esc(d.error)+'</div>';return;} $("#drift-out").innerHTML='<div class="card"><span class="badge '+(d.status==="PASS"?"pass-bg PASS":"fail-bg FAIL")+'">'+esc(d.status)+'</span> <span class="mut">'+esc(d.method.toUpperCase())+' score '+(Math.round(d.score*1000)/1000)+' (threshold '+d.threshold+')</span><div class="mut" style="margin-top:6px">'+(d.drifted?"The distribution has shifted beyond tolerance — escalate.":"No significant distributional shift.")+'</div></div>'; }); };

  get("/v1/conformance").then(function(c){ $("#conf-out").innerHTML='<span class="pill '+(c.conformant?"PASS":"FAIL")+'">conformance '+c.passed+'/'+c.total+'</span> <span class="mut">the contract any AiGovOps gate, in any language, must pass</span>'; });

  function compliant(policy){ var o={}; (policy.rules||[]).forEach(function(r){ var v=r.op==="oneOf"?(r.value&&r.value[0]):r.op==="lessThan"?(r.value-1):r.op==="greaterThan"?(r.value+1):r.op==="required"?true:r.op==="matches"?"compliant":r.value; var p=r.path.split("."),x=o; for(var i=0;i<p.length-1;i++){ x[p[i]]=x[p[i]]||{}; x=x[p[i]]; } x[p[p.length-1]]=v; }); return o; }
})();
</script>
</body></html>`;
}
