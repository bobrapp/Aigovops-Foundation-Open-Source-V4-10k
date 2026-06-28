// M11 — the Setup Wizard, served at "/setup". A warm, Intuit-grade, no-code flow for policy folks.
// One decision per screen, plain language, a progress bar, Jeeves doing the technical work behind
// each screen, ending in a signed Compliance Certificate. Calls the same gate API as the Studio.
// (Inner <script> uses string concatenation only, so this lives in one outer template literal.)

export function wizardHTML() {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>AiGovOps · Get Governed</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>
  :root{--bg:#f6f3ec;--card:#ffffff;--ink:#1d2430;--muted:#5d6b7a;--line:#e7e0d3;--teal:#0f9b8e;--green:#1f9d57;--gold:#c98a16;--rose:#d4495f;
    --display:"Fraunces",Georgia,serif;--sans:"Inter",system-ui,sans-serif}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);line-height:1.6;
    background-image:radial-gradient(1100px 500px at 50% -200px,rgba(15,155,142,.10),transparent 70%)}
  .top{max-width:640px;margin:0 auto;padding:22px 24px 0;display:flex;align-items:center;gap:10px}
  .dot{width:11px;height:11px;border-radius:50%;background:var(--teal);box-shadow:0 0 14px rgba(15,155,142,.6)}
  .brand{font-family:var(--display);font-weight:700;font-size:17px}
  .prog{max-width:640px;margin:14px auto 0;padding:0 24px}.bar{height:7px;border-radius:99px;background:#e7e0d3;overflow:hidden}
  .bar>i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--teal),var(--green));transition:width .4s}
  .stepno{font-size:12px;color:var(--muted);margin-top:6px}
  main{max-width:640px;margin:0 auto;padding:22px 24px 70px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:30px;box-shadow:0 14px 40px rgba(29,36,48,.06)}
  h1{font-family:var(--display);font-weight:600;font-size:clamp(26px,5vw,34px);line-height:1.12;margin:.1em 0 .25em}
  .lede{color:var(--muted);font-size:16px;margin:0 0 8px}
  .opts{display:grid;gap:12px;margin:22px 0}.opt{display:flex;gap:13px;align-items:flex-start;text-align:left;background:#fbfaf6;border:1.5px solid var(--line);border-radius:14px;padding:15px 16px;cursor:pointer;transition:.15s;font:inherit;color:inherit;width:100%}
  .opt:hover{border-color:var(--teal)}.opt.sel{border-color:var(--teal);background:#effaf8;box-shadow:0 0 0 3px rgba(15,155,142,.12)}
  .opt .ic{font-size:22px;line-height:1}.opt b{display:block;font-size:15.5px}.opt span{color:var(--muted);font-size:13.5px}
  .chips{display:flex;flex-wrap:wrap;gap:9px;margin:20px 0}.chip{border:1.5px solid var(--line);background:#fbfaf6;border-radius:99px;padding:8px 15px;cursor:pointer;font:inherit;font-size:14px}.chip.sel{border-color:var(--teal);background:#effaf8;color:var(--teal);font-weight:600}
  textarea{width:100%;min-height:120px;border:1.5px solid var(--line);border-radius:13px;padding:13px;font:inherit;font-size:15px;resize:vertical;background:#fbfaf6}
  .nav{display:flex;justify-content:space-between;align-items:center;margin-top:26px;gap:12px}
  button.go{background:var(--ink);color:#fff;border:none;border-radius:12px;padding:13px 26px;font:inherit;font-weight:600;font-size:15px;cursor:pointer}
  button.go.big{background:linear-gradient(180deg,var(--green),#147a43)}button.go:disabled{opacity:.4;cursor:default}
  button.back{background:none;border:none;color:var(--muted);cursor:pointer;font:inherit}
  .reassure{color:var(--muted);font-size:13px;margin-top:14px}
  .meter{height:10px;border-radius:99px;background:#eee7d9;overflow:hidden;margin:10px 0}.meter>i{display:block;height:100%;background:linear-gradient(90deg,var(--rose),var(--gold),var(--green))}
  .gap{background:#fbfaf6;border:1px solid var(--line);border-radius:12px;padding:13px 15px;margin:9px 0}.gap b{font-size:14.5px}.gap .c{color:var(--gold);font-size:12.5px}.gap .added{color:var(--green);font-weight:600;font-size:13px}
  .cert{background:linear-gradient(160deg,#0c1430,#10204a);color:#eaf2ff;border-radius:18px;padding:26px;text-align:center;position:relative;overflow:hidden}
  .cert .seal{font-size:40px}.cert h2{font-family:var(--display);margin:6px 0 2px;color:#fff}.cert .hash{font-family:ui-monospace,monospace;font-size:11.5px;color:#9fb3d8;word-break:break-all;margin-top:10px}
  .cert .ok{display:inline-block;margin-top:12px;background:rgba(87,224,138,.16);color:#7ef0a6;border-radius:99px;padding:5px 14px;font-size:13px}
  .spin{width:34px;height:34px;border:3px solid #e7e0d3;border-top-color:var(--teal);border-radius:50%;animation:s 1s linear infinite;margin:18px auto}@keyframes s{to{transform:rotate(360deg)}}
  .pill{display:inline-block;font-size:12px;border:1px solid var(--line);border-radius:99px;padding:3px 10px;color:var(--muted)}
</style></head><body>
<div class="top"><span class="dot"></span><span class="brand">AiGovOps</span><span class="pill" style="margin-left:auto">Get Governed · ~10 min · no code</span></div>
<div class="prog"><div class="bar"><i id="bar"></i></div><div class="stepno" id="stepno"></div></div>
<main><div class="card" id="stage"></div></main>
<script>
(function(){
  var API=location.origin;
  var S={ sector:"", jurisdiction:"", riskTier:"", dataTypes:["personal"], regs:[], policy:"", report:null, authored:null, receipt:null, publicKey:null };
  var step=0, TOTAL=8;
  var stage=document.getElementById("stage");
  function $(id){return document.getElementById(id);}
  function post(p,b){return fetch(API+p,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b||{})}).then(function(r){return r.json();});}
  function esc(s){return String(s==null?"":s).replace(/[&<>]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});}
  function ctx(){return {sector:S.sector||undefined,jurisdiction:S.jurisdiction||undefined,riskTier:S.riskTier||undefined,dataTypes:S.dataTypes};}
  function prog(){ $("bar").style.width=Math.round(step/(TOTAL-1)*100)+"%"; $("stepno").textContent="Step "+(step+1)+" of "+TOTAL; }
  function go(n){ step=n; prog(); render(); window.scrollTo(0,0); }

  function nav(html, opts){ opts=opts||{}; var back=step>0&&!opts.noback?'<button class="back" onclick="__back()">← Back</button>':'<span></span>'; var next=opts.next?'<button class="go '+(opts.big?'big':'')+'" id="next"'+(opts.disabled?' disabled':'')+'>'+opts.next+'</button>':''; return html+'<div class="nav">'+back+next+'</div>'; }
  window.__back=function(){ if(step>0) go(step-1); };
  function onNext(fn){ var b=$("next"); if(b) b.onclick=fn; }

  var SECTORS=[["education","🎓","Education","Schools, universities, ed-tech"],["healthcare","🩺","Healthcare","Clinical, patient-facing, health data"],["employment","💼","HR / Hiring","Recruiting, employee decisions"],["finance","🏦","Finance","Lending, fraud, advisory"],["","🏢","Something else","General business use"]];
  var JURIS=[["EU","European Union"],["US","United States"],["US-CO","Colorado"],["US-NYC","New York City"]];
  var RISKS=[["high","⚖️","It makes decisions about people","Hiring, credit, grades, eligibility — higher risk"],["limited","💬","It assists people","Chatbots, drafting, suggestions a human reviews"],["minimal","🔧","Internal tooling","Low-stakes, behind the scenes"]];

  function render(){
    if(step===0){ stage.innerHTML=nav('<h1>Let\\'s get your AI governed.</h1><p class="lede">Answer a few plain questions. We\\'ll check your policy against the regulations that apply to you, set up the guardrails, and hand you a signed certificate of compliance. No code — about ten minutes.</p><p class="reassure">Jeeves does the technical work behind every screen.</p>',{next:"Get started →",noback:true}); onNext(function(){go(1);}); }
    else if(step===1){ stage.innerHTML=nav('<h1>What does your organization do?</h1><p class="lede">This tells us which rules are likely to apply.</p><div class="opts" id="o"></div>',{next:"Continue →",disabled:!S.sector&&S.sector!==""}); fillOpts("o",SECTORS,function(v){S.sector=v;},S.sector); onNext(function(){go(2);}); markNext(true); }
    else if(step===2){ stage.innerHTML=nav('<h1>Where do you operate?</h1><p class="lede">Pick all that apply.</p><div class="chips" id="c"></div>',{next:"Continue →"}); fillChips("c",JURIS,"jurisdiction"); onNext(function(){go(3);}); }
    else if(step===3){ stage.innerHTML=nav('<h1>What does your AI do?</h1><p class="lede">In plain terms — this sets how strict the guardrails should be.</p><div class="opts" id="o"></div>',{next:"Continue →"}); fillOpts("o",RISKS,function(v){S.riskTier=v;},S.riskTier); onNext(function(){go(4);}); markNext(true); }
    else if(step===4){ stage.innerHTML='<div class="spin"></div><p class="lede" style="text-align:center">Finding the rules that apply to you…</p>'; post("/v1/profiles",{context:ctx()}).then(function(r){ S.available=r.frameworks||[]; S.regs=S.available.slice(); renderRegs(); }); }
    else if(step===5){ stage.innerHTML=nav('<h1>Bring your policy.</h1><p class="lede">Paste your AI policy in plain words — or skip and we\\'ll start you from a template for the rules you picked.</p><textarea id="pol" placeholder="e.g. Our school uses an AI tutor. We tell students it is AI and teachers review its suggestions.">'+esc(S.policy)+'</textarea>',{next:"Check my policy →"}); onNext(function(){ S.policy=$("pol").value; go(6); }); }
    else if(step===6){ stage.innerHTML='<div class="spin"></div><p class="lede" style="text-align:center">Checking your policy against '+ (S.regs.length||"the")+' framework(s)…</p>'; runCheck(); }
    else if(step===7){ stage.innerHTML=nav('<h1>One last thing — your guardrails.</h1><p class="lede">Sensible defaults, changeable any time.</p><div class="opts"><label class="opt sel"><span class="ic">🧑\\u200d⚖️</span><span><b>A human approves anything irreversible</b><span>Recommended — agents propose, you decide.</span></span></label><label class="opt sel"><span class="ic">🛑</span><span><b>Hard spend &amp; rate caps on</b><span>The system pauses at the cap instead of pushing through.</span></span></label></div>',{next:"Go live →",big:true}); onNext(function(){ go(8); }); }
    else if(step===8){ stage.innerHTML='<div class="spin"></div><p class="lede" style="text-align:center">Turning on governance and signing your certificate…</p>'; goLive(); }
  }

  function fillOpts(id,list,set,cur){ var box=$(id); box.innerHTML=""; list.forEach(function(o){ var b=document.createElement("button"); b.className="opt"+(cur===o[0]?" sel":""); b.innerHTML='<span class="ic">'+o[1]+'</span><span><b>'+esc(o[2])+'</b><span>'+esc(o[3])+'</span></span>'; b.onclick=function(){ set(o[0]); Array.prototype.forEach.call(box.children,function(c){c.classList.remove("sel");}); b.classList.add("sel"); markNext(true); }; box.appendChild(b); }); }
  function fillChips(id,list,key){ var box=$(id); list.forEach(function(o){ var b=document.createElement("button"); b.className="chip"+(S[key]===o[0]?" sel":""); b.textContent=o[1]; b.onclick=function(){ S[key]=(S[key]===o[0]?"":o[0]); Array.prototype.forEach.call(box.children,function(c){c.classList.remove("sel");}); if(S[key]===o[0])b.classList.add("sel"); }; box.appendChild(b); }); }
  function markNext(on){ var b=$("next"); if(b) b.disabled=!on; }

  function renderRegs(){ var h='<h1>Here\\'s what applies to you.</h1><p class="lede">We picked these from your answers. Uncheck anything that doesn\\'t fit.</p><div class="chips" id="rc"></div>'; stage.innerHTML=nav(h,{next:"That\\'s right →"}); var box=$("rc"); (S.available||[]).forEach(function(f){ var b=document.createElement("button"); b.className="chip sel"; b.textContent=f; b.onclick=function(){ var i=S.regs.indexOf(f); if(i<0){S.regs.push(f);b.classList.add("sel");} else {S.regs.splice(i,1);b.classList.remove("sel");} }; box.appendChild(b); }); onNext(function(){go(5);}); }

  function runCheck(){ post("/v1/improve",{policyText:S.policy,context:ctx()}).then(function(r){ S.report=r; var pct=Math.round((r.coverageScore||0)*100); var h='<h1>You\\'re '+pct+'% covered.</h1><div class="meter"><i style="width:'+pct+'%"></i></div><p class="lede">'+(r.gaps.length?('We found '+r.gaps.length+' gap(s). Jeeves can close them for you — each becomes a rule with the regulation it satisfies.'):'Your policy already covers the applicable requirements. Nice.')+'</p><div id="gaps"></div>'; stage.innerHTML=nav(h,{next:r.gaps.length?"Close the gaps for me →":"Continue →"}); var g=$("gaps"); r.gaps.slice(0,6).forEach(function(x){ g.innerHTML+='<div class="gap"><b>'+esc(x.framework)+' — '+esc(x.title)+'</b><div class="c">'+esc(x.citation)+'</div><div class="mut" style="color:var(--muted);font-size:13px;margin-top:4px">'+esc(x.suggestedClause)+'</div></div>'; }); if(r.gaps.length>6) g.innerHTML+='<div class="reassure">…and '+(r.gaps.length-6)+' more.</div>'; onNext(function(){ // author the gates (Jeeves)
    post("/v1/author",{policyText:S.policy,context:ctx()}).then(function(a){ S.authored=a; go(7); }); }); }); }

  function compliant(policy){ var o={}; (policy.rules||[]).forEach(function(r){ var v=r.op==="oneOf"?(r.value&&r.value[0]):r.op==="lessThan"?(r.value-1):r.op==="greaterThan"?(r.value+1):r.op==="required"?true:r.op==="matches"?"compliant":r.value; var p=r.path.split("."),x=o; for(var i=0;i<p.length-1;i++){x[p[i]]=x[p[i]]||{};x=x[p[i]];} x[p[p.length-1]]=v; }); return o; }
  function goLive(){ if(!S.authored){ post("/v1/author",{policyText:S.policy,context:ctx()}).then(function(a){S.authored=a;goLive();}); return; } post("/v1/decide",{policy:S.authored.policy,payload:compliant(S.authored.policy)}).then(function(d){ S.receipt=d.receipt; S.publicKey=d.publicKey; renderCert(d); }); }
  function renderCert(d){ var frameworks=[].concat(Object.values(S.authored.citations||{})).join(" ").match(/[A-Z][^,]*?(Act|GDPR|FERPA|HIPAA|RMF|ISO|OWASP|Law)/g)||S.regs; var hash=(d.receipt&&d.receipt.evidenceHash)||""; var h='<div class="cert"><div class="seal">🛡️</div><h2>You\\'re governed.</h2><div style="color:#bcd0f0">Compliance Certificate · AiGovOps</div><div class="ok">✓ '+(S.authored.policy.rules.length)+' gates live &amp; signed</div><div class="hash">evidence '+esc(hash.slice(0,40))+'…</div><div style="margin-top:10px;font-size:12.5px;color:#9fb3d8">verifiable offline · '+new Date().toISOString().slice(0,10)+'</div></div><p class="lede" style="margin-top:18px">Every governed decision from here is checked against your rules and signed — proof you can hand an auditor. You can open the developer console any time.</p>'; stage.innerHTML=nav(h,{next:"Open dashboard →",noback:true}); $("bar").style.width="100%"; $("stepno").textContent="Done"; confetti(); onNext(function(){ location.href="/studio"; }); }
  function confetti(){ for(var i=0;i<70;i++){ var d=document.createElement("div"); var x=Math.random()*100; var c=["#0f9b8e","#1f9d57","#c98a16","#d4495f"][i%4]; d.style.cssText="position:fixed;top:-10px;left:"+x+"vw;width:8px;height:12px;background:"+c+";opacity:.9;z-index:99;transform:rotate("+(Math.random()*360)+"deg);transition:all "+(1.6+Math.random()*1.4)+"s ease-out"; document.body.appendChild(d); (function(el){ setTimeout(function(){ el.style.top="105vh"; el.style.left=(parseFloat(el.style.left)+ (Math.random()*20-10))+"vw"; el.style.opacity="0"; },20); setTimeout(function(){el.remove();},3200); })(d); } }

  prog(); render();
})();
</script></body></html>`;
}
