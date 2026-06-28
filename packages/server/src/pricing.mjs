// M15 — the pricing / "choose how to run it" page, served at /pricing. Rendered from the single
// source of truth (@aigovops/plans). Leads with the promise: hosted to try, self-host forever free.
import { PLANS } from "../../plans/src/index.mjs";

const money = (p) => (p === 0 ? "Free" : p == null ? "Let's talk" : "$" + p);
const lim = (v) => (v === Infinity ? "Unlimited" : v.toLocaleString());

export function pricingHTML() {
  const order = ["free", "team", "enterprise"];
  const cards = order.map((id, i) => {
    const p = PLANS[id];
    const featured = id === "team";
    const feats = p.features.includes("*")
      ? ["Everything in Team", "SSO &amp; SCIM", "Support SLA", "Unlimited everything"]
      : [`${lim(p.limits.decisionsPerMonth)} decisions / mo`, `${lim(p.limits.gates)} gates`, `${p.seats === Infinity ? "Unlimited" : p.seats} seats`,
         p.features.includes("attestation") ? "Signed attestations" : "Signed receipts",
         p.features.includes("alerts") ? "Drift alerts &amp; profiles" : "Drift detection"];
    return `<div class="plan${featured ? " feat" : ""}">${featured ? '<div class="tag">Most popular</div>' : ""}
      <h3>${p.name}</h3><div class="price">${money(p.price)}${p.price > 0 ? '<span>/mo</span>' : ""}</div>
      <p class="blurb">${p.blurb}</p>
      <ul>${feats.map((f) => `<li>${f}</li>`).join("")}</ul>
      <a class="cta${featured ? " p" : ""}" href="/setup">${p.price === 0 ? "Start free" : p.price == null ? "Contact us" : "Start trial"}</a></div>`;
  }).join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>AiGovOps · Pricing</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>
  :root{--bg:#f6f3ec;--card:#fff;--ink:#1d2430;--muted:#5d6b7a;--line:#e7e0d3;--teal:#0f9b8e;--green:#1f9d57;--gold:#c98a16;--navy:#0c1430}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:"Inter",system-ui,sans-serif;line-height:1.6;
    background-image:radial-gradient(1200px 520px at 50% -240px,rgba(15,155,142,.12),transparent 70%)}
  a{text-decoration:none}.wrap{max-width:1000px;margin:0 auto;padding:0 24px}
  header{padding:20px 0;display:flex;align-items:center;gap:10px}.dot{width:11px;height:11px;border-radius:50%;background:var(--teal);box-shadow:0 0 14px rgba(15,155,142,.6)}
  .brand{font-family:"Fraunces",serif;font-weight:700;font-size:18px}header nav{margin-left:auto}header nav a{color:var(--muted);margin-left:18px;font-size:14px}
  h1{font-family:"Fraunces",serif;font-weight:600;font-size:clamp(32px,6vw,52px);line-height:1.08;margin:30px 0 10px;text-align:center}
  .lede{text-align:center;color:var(--muted);font-size:18px;max-width:620px;margin:0 auto 8px}
  .onprem{max-width:760px;margin:22px auto 0;background:#fff;border:1.5px solid var(--line);border-radius:16px;padding:16px 20px;display:flex;gap:14px;align-items:center;box-shadow:0 10px 30px rgba(29,36,48,.05)}
  .onprem .ic{font-size:26px}.onprem b{font-family:"Fraunces",serif}.onprem code{background:#f2eee4;border-radius:7px;padding:2px 7px;font-size:13px}
  .plans{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:34px 0}@media(max-width:780px){.plans{grid-template-columns:1fr}}
  .plan{background:var(--card);border:1.5px solid var(--line);border-radius:18px;padding:24px;position:relative;box-shadow:0 12px 36px rgba(29,36,48,.05);display:flex;flex-direction:column}
  .plan.feat{border-color:var(--teal);box-shadow:0 18px 50px rgba(15,155,142,.16);transform:translateY(-6px)}
  .tag{position:absolute;top:-12px;left:24px;background:var(--teal);color:#fff;font-size:12px;font-weight:600;padding:4px 11px;border-radius:99px}
  .plan h3{font-family:"Fraunces",serif;font-weight:600;font-size:21px;margin:4px 0 8px}.price{font-size:34px;font-weight:700}.price span{font-size:15px;color:var(--muted);font-weight:500}
  .blurb{color:var(--muted);font-size:14px;min-height:42px}ul{list-style:none;padding:0;margin:14px 0 20px}li{padding:6px 0 6px 26px;position:relative;font-size:14.5px}li:before{content:"✓";position:absolute;left:0;color:var(--green);font-weight:700}
  .cta{margin-top:auto;display:block;text-align:center;border:1.5px solid var(--ink);border-radius:12px;padding:12px;font-weight:600;color:var(--ink)}.cta.p{background:var(--ink);color:#fff;border-color:var(--ink)}.cta:hover{filter:brightness(1.05)}
  .self{background:var(--navy);color:#eaf2ff;border-radius:20px;padding:30px;text-align:center;margin:10px 0 50px}
  .self h2{font-family:"Fraunces",serif;color:#fff;margin:0 0 6px}.self p{color:#bcd0f0;max-width:620px;margin:0 auto 14px}
  .self code{background:rgba(255,255,255,.1);border-radius:8px;padding:8px 14px;display:inline-block;font-size:14px;color:#eaf2ff}
  .self .badges{margin-top:14px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap}.badge{background:rgba(57,208,195,.16);color:#7ef0d8;border-radius:99px;padding:5px 13px;font-size:13px}
  footer{text-align:center;color:var(--muted);font-size:13px;padding:0 0 40px}
</style></head><body><div class="wrap">
<header><span class="dot"></span><span class="brand">AiGovOps</span><nav><a href="/setup">Wizard</a><a href="/studio">Console</a><a href="https://github.com/bobrapp/Aigovops-Foundation-Open-Source-V4-10k">GitHub ↗</a></nav></header>
<h1>Govern your AI.<br/>Hosted, or your own infra.</h1>
<p class="lede">Try it on our hosted demo in minutes — or run the identical open-source stack on-prem, in a lab, or on a laptop. Same product. No lock-in, ever.</p>
<div class="onprem"><span class="ic">🔒</span><div><b>Always self-hostable, forever free.</b> The whole platform is MIT-licensed and zero-dependency. The hosted tiers below simply fund the Foundation and offer a zero-ops path. Run it yourself: <code>curl -fsSL get.aigovops.org | sh</code></div></div>
<div class="plans">${cards}</div>
<div class="self"><h2>Self-hosted · ${money(PLANS.selfhost.price)}</h2><p>Your infrastructure, your keys, unlimited everything — on-prem, in your VPC/enclave, on a single VPS, or on a device. The exact code that runs our SaaS.</p><code>curl -fsSL get.aigovops.org | sh</code><div class="badges"><span class="badge">MIT licensed</span><span class="badge">zero dependencies</span><span class="badge">~20 Apache-2.0 backends</span><span class="badge">offline-capable</span></div></div>
<footer>Hosted revenue funds the AiGovOps Foundation. Agents do the bureaucracy; humans hold the keys.</footer>
</div></body></html>`;
}
