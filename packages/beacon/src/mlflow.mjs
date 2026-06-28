// Beacon v-next (M6) — MLflow as the model system-of-record.
//
// Pulls a model version from MLflow's REST API and shapes it into evidence Beacon can sign —
// so a signed receipt attests to a specific registered model version (its run, stage, and URI).
// Injectable transport keeps it unit-testable against canned responses; no runtime dependency.
import { signEvidence } from "./index.mjs";

const defaultTransport = async ({ url, headers = {} }) => {
  const res = await fetch(url, { headers: { accept: "application/json", ...headers } });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
};

/** Fetch a model version → an evidence object (no signing). */
export async function evidenceFromMlflow({ baseUrl, name, version, transport = defaultTransport, headers }) {
  const url = `${baseUrl}/api/2.0/mlflow/model-versions/get?name=${encodeURIComponent(name)}&version=${encodeURIComponent(version)}`;
  const { status, json } = await transport({ url, headers });
  const mv = json?.model_version;
  if (status !== 200 || !mv) throw new Error(`MLflow model-version ${status}`);
  return {
    source: "mlflow",
    model: mv.name,
    version: mv.version,
    runId: mv.run_id ?? null,
    stage: mv.current_stage ?? null,
    uri: mv.source ?? null,
  };
}

/** Fetch a model version and sign a Beacon receipt over it. */
export async function signMlflowModel({ baseUrl, name, version, beacon, at, transport, headers }) {
  const payload = await evidenceFromMlflow({ baseUrl, name, version, transport, headers });
  const out = signEvidence({
    configured: true,
    payload,
    privateKey: beacon?.privateKey,
    publicKey: beacon?.publicKey,
    issuedAt: at,
  });
  return { evidence: payload, receipt: out.receipt, publicKey: out.publicKey };
}
