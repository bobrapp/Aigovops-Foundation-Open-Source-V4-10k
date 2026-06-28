#!/usr/bin/env python3
"""Proves a non-Node client honors the same gate contract. Run against a live gate:

    node packages/server/src/cli.mjs &        # start the gate
    python3 sdk/python/conformance.py          # → ✓ Python SDK conformance: PASS
"""
import sys
from aigovops import GateClient

GOOD = {"profile": "baseline", "payload": {"model": "claude-opus-4-8", "humanApproved": True}}


def main(base_url="http://localhost:8930"):
    g = GateClient(base_url)

    r = g.decide(GOOD)
    assert r["status"] == "PASS" and r.get("receipt"), "a clean decide must PASS and be signed"

    r2 = g.decide({"profile": "baseline", "payload": {}})
    assert r2["status"] == "FAIL" and "receipt" not in r2, "a criteria failure must deny with no receipt"

    rep = g.improve("We use an AI tutor.", {"sector": "education", "jurisdiction": "EU", "dataTypes": ["children"], "riskTier": "high"})
    assert len(rep["gaps"]) > 0, "improve must return cited gaps"

    conf = g.conformance()
    assert conf["conformant"], "the gate's own conformance suite must pass"

    print(f"✓ Python SDK conformance: PASS ({conf['passed']}/{conf['total']} gate checks)")


if __name__ == "__main__":
    try:
        main(sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8930")
    except AssertionError as e:
        print(f"✗ conformance FAILED: {e}")
        sys.exit(1)
