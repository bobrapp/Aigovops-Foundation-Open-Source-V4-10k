# AiGovOps — Python SDK

A stdlib-only (no dependencies) client for the gate API — the same wire contract as the JS
`GateClient`. Proof that a non-Node port honors the governed core.

```python
from aigovops import GateClient

gate = GateClient("http://localhost:8930")
report = gate.improve("We use an AI tutor.", {"sector": "education", "jurisdiction": "EU"})
authored = gate.author("We use an AI tutor.", {"sector": "education", "jurisdiction": "EU"})
decision = gate.decide({"profile": "baseline", "payload": {"model": "claude-opus-4-8", "humanApproved": True}})
# decision["status"] == "PASS"  ·  decision["receipt"] is signed
```

## Conformance

Any SDK in any language must honor the contract. Run it against a live gate:

```bash
node packages/server/src/cli.mjs &
python3 sdk/python/conformance.py     # → ✓ Python SDK conformance: PASS
```

Methods mirror the JS SDK: `decide · improve · author · compare · account · conformance · evidence`.
Other languages follow the same shape against `/openapi.json`.
