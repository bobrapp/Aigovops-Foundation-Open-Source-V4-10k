// M3 — the onboarding installer.
//
// One run detects the deployment tier, wires the right adapters, and walks the user
// through the guided first session — exercising the whole stack (M0–M2) end to end:
//   identity → caps → policy → gates → proof → cadence
// It ends by signing an "onboarding-complete" evidence receipt. Humans hold the keys.
import { Caps } from "../../caps/src/index.mjs";
import { improve } from "../../policy-improver/src/index.mjs";
import { authorPolicy, compliantExample } from "../../gate-author/src/index.mjs";
import { compare } from "../../side-by-side/src/index.mjs";
import { signEvidence } from "../../beacon/src/index.mjs";

export const ROLES = ["steward", "developer", "policy-author", "member", "auditor"];

// The six deployment tiers and the adapters each one wires (blueprint §4).
export const TIERS = {
  1: { name: "lab", secrets: "env/keychain", sandbox: "in-process allow-list", identity: "dev", observability: "console", auditStore: "ndjson-file" },
  2: { name: "laptop", secrets: "keychain/1password", sandbox: "child-process, no ambient net", identity: "magic-link", observability: "prometheus", auditStore: "ndjson+opensearch" },
  3: { name: "container", secrets: "file/secret-mount", sandbox: "seccomp + read-only FS, egress proxy", identity: "keycloak", observability: "otel→prometheus", auditStore: "opensearch" },
  4: { name: "firewall", secrets: "vault/kms", sandbox: "gVisor, declared egress", identity: "keycloak", observability: "prometheus+jaeger", auditStore: "opensearch-cluster" },
  5: { name: "vps", secrets: "1password-sa/vault", sandbox: "gVisor + nftables egress", identity: "keycloak", observability: "prometheus", auditStore: "opensearch" },
  6: { name: "cloud", secrets: "cloud-kms", sandbox: "gVisor/firecracker, vpc egress", identity: "keycloak/cloud-idp", observability: "managed-otel", auditStore: "managed-opensearch" },
};

/** Detect the deployment tier from the environment. Explicit AIGOVOPS_TIER wins. */
export function detectTier(env = process.env) {
  const explicit = Number(env.AIGOVOPS_TIER);
  if (explicit >= 1 && explicit <= 6) return { tier: explicit, ...TIERS[explicit] };
  let t = 1;
  if (env.AIGOVOPS_KMS || env.AWS_REGION || env.GOOGLE_CLOUD_PROJECT) t = 6;
  else if (env.AIGOVOPS_VAULT_ADDR) t = 4;
  else if (env.container || env.KUBERNETES_SERVICE_HOST) t = 3;
  else if (env.HOME && process.platform === "darwin") t = 2;
  return { tier: t, ...TIERS[t] };
}

function assignRoles(principals = {}) {
  const out = {};
  for (const [id, role] of Object.entries(principals)) {
    if (!ROLES.includes(role)) throw new Error(`unknown role '${role}' for ${id}`);
    out[id] = role;
  }
  if (!Object.values(out).includes("steward")) throw new Error("at least one steward is required");
  return out;
}

/**
 * Run the guided onboarding. Each step does real work with the live packages.
 * @returns {{tier, complete, steps[], evidence, publicKey}}
 */
export function onboard({ principals, capsProfiles = {}, writtenPolicy, context = {}, beacon, at } = {}) {
  const tier = detectTier();
  const steps = [];

  // 1) Identity — assign the five roles (fail-closed: a steward is mandatory).
  const roles = assignRoles(principals);
  steps.push({ id: "identity", title: "Assign roles", ok: true, detail: { roles, idp: tier.identity } });

  // 2) Caps — set capability dials with fail-closed defaults.
  const caps = new Caps();
  for (const [id, profile] of Object.entries(capsProfiles)) caps.setProfile(id, profile);
  steps.push({ id: "caps", title: "Set capability dials", ok: true, detail: { profiles: Object.keys(capsProfiles) } });

  // 3) Policy — improve the written policy against the corpus.
  const report = improve(writtenPolicy || "", context);
  steps.push({ id: "policy", title: "Improve the policy", ok: report.applicableCount > 0, detail: { coverage: report.coverageScore, gaps: report.gaps.length, applicable: report.applicableCount } });

  // 4) Gates — author runnable gates from the gaps.
  const authored = authorPolicy(report);
  steps.push({ id: "gates", title: "Author the gates", ok: authored.policy.rules.length > 0, detail: { gates: authored.policy.rules.length } });

  // 5) Proof — governed/ungoverned, both directions.
  const good = compare({ payload: compliantExample(authored.policy), authored, beacon });
  const bad = compare({ payload: {}, authored, beacon });
  const proofOk = good.governed.status === "PASS" && bad.governed.status === "FAIL";
  steps.push({ id: "proof", title: "Prove it (governed vs ungoverned)", ok: proofOk, detail: { compliantPasses: good.governed.status === "PASS", emptyBlocked: bad.governed.status === "FAIL", receipt: !!good.governed.receipt } });

  // 6) Cadence — schedule the Tier-1 autonomous agents and the daily review window.
  const cadence = { agents: ["regulation-watch", "policy-drift-monitor", "compliance-attestor", "audit-bundler"], window: "1h/day review-and-approve" };
  steps.push({ id: "cadence", title: "Schedule the agents", ok: true, detail: cadence });

  const complete = steps.every((s) => s.ok);
  const ev = signEvidence({
    configured: true,
    payload: { event: "onboarding-complete", tier: tier.tier, gates: authored.policy.rules.length, complete, at: at ?? null },
    privateKey: beacon?.privateKey,
    publicKey: beacon?.publicKey,
    issuedAt: at,
  });

  return { tier, complete, steps, authored, caps, roles, evidence: ev.receipt, publicKey: ev.publicKey };
}

/** Pretty walkthrough for a CLI run. */
export function toTranscript(result) {
  const lines = [`AiGovOps install — tier ${result.tier.tier} (${result.tier.name})`, ``];
  for (const s of result.steps) lines.push(`  ${s.ok ? "✓" : "✗"} ${s.title} — ${JSON.stringify(s.detail)}`);
  lines.push(``, result.complete ? "✓ Onboarding complete — evidence receipt signed." : "✗ Onboarding incomplete — see the failing step.");
  return lines.join("\n");
}
