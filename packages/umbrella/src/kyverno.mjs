// Umbrella v-next (M8) — Kubernetes enforcement via a Kyverno ClusterPolicy emitter.
//
// Projects an Umbrella policy onto a Kyverno ClusterPolicy so the same governance rules can be
// enforced at the cluster admission boundary: each Umbrella rule becomes a validate rule that
// requires a corresponding `aigovops.org/<path>` label on Pods/Deployments.
const slug = (s) => String(s).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

/** @returns {{apiVersion, kind, metadata, spec}} a Kyverno ClusterPolicy object */
export function toKyvernoPolicy(umbrellaPolicy, { name, failureAction = "Enforce" } = {}) {
  const rules = (umbrellaPolicy.rules || []).map((r) => ({
    name: `require-${slug(r.path)}`,
    match: { any: [{ resources: { kinds: ["Pod", "Deployment"] } }] },
    validate: {
      message: r.message || `must satisfy policy on "${r.path}"`,
      pattern: { metadata: { labels: { [`aigovops.org/${slug(r.path)}`]: "?*" } } },
    },
  }));
  return {
    apiVersion: "kyverno.io/v1",
    kind: "ClusterPolicy",
    metadata: { name: name || slug(umbrellaPolicy.name || "aigovops-policy") },
    spec: { validationFailureAction: failureAction, background: true, rules },
  };
}
