"""AiGovOps gate client (Python). Stdlib only — no dependencies, matching the zero-dep core.

    from aigovops import GateClient
    gate = GateClient("http://localhost:8930")
    gate.improve("We use an AI tutor.", {"sector": "education", "jurisdiction": "EU"})
"""
import json
import urllib.request

__version__ = "4.0.0"


class GateClient:
    def __init__(self, base_url="http://localhost:8930", tenant=None):
        self.base_url = base_url.rstrip("/")
        self.tenant = tenant

    def _headers(self):
        h = {"content-type": "application/json"}
        if self.tenant:
            h["x-aigovops-tenant"] = self.tenant
        return h

    def _post(self, path, body):
        data = json.dumps(body or {}).encode()
        req = urllib.request.Request(self.base_url + path, data=data, headers=self._headers(), method="POST")
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())

    def _get(self, path):
        req = urllib.request.Request(self.base_url + path, headers=self._headers())
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())

    # The same contract as the JS GateClient.
    def decide(self, proposal):
        return self._post("/v1/decide", proposal)

    def improve(self, policy_text, context=None):
        return self._post("/v1/improve", {"policyText": policy_text, "context": context or {}})

    def author(self, policy_text, context=None):
        return self._post("/v1/author", {"policyText": policy_text, "context": context or {}})

    def compare(self, args):
        return self._post("/v1/compare", args)

    def account(self):
        return self._get("/v1/account")

    def conformance(self):
        return self._get("/v1/conformance")

    def evidence(self):
        return self._get("/v1/evidence")
