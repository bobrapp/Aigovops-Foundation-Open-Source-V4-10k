import { test } from "node:test";
import assert from "node:assert/strict";
import { servicesFor, composeFor, composeYaml, caddyfileFor, plan, urlsFor } from "../src/index.mjs";

test("tier maps to the right backend set", () => {
  assert.deepEqual(servicesFor({ tier: 1 }), []);
  assert.deepEqual(servicesFor({ tier: 4 }).sort(), ["keycloak", "opensearch", "prometheus"]);
  assert.deepEqual(servicesFor({ tier: 1, withServices: ["opensearch"] }), ["opensearch"]); // explicit extra
});

test("compose: tier 1 is gate-only; tier 4 adds Caddy + the heavyweight stack", () => {
  const c1 = composeFor({ tier: 1 });
  assert.deepEqual(Object.keys(c1.services), ["gate"]);
  const c4 = composeFor({ tier: 4 });
  assert.deepEqual(Object.keys(c4.services).sort(), ["caddy", "gate", "keycloak", "opensearch", "prometheus"]);
  assert.ok(c4.volumes.caddy_data === null); // named volume declared
  assert.ok(c4.services.gate.ports[0].endsWith(":8930"));
});

test("composeYaml emits a non-empty, structured document", () => {
  const y = composeYaml({ tier: 4, port: 8930 });
  assert.match(y, /^name: aigovops/m);
  assert.match(y, /services:/);
  assert.match(y, /image: "quay\.io\/keycloak\/keycloak:26\.0"/); // colon-containing values are quoted
  assert.match(y, /image: "caddy:2-alpine"/);
  assert.match(y, /- "80:80"/);
});

test("Caddyfile reverse-proxies the gate (auto-HTTPS with a domain, :80 without)", () => {
  assert.match(caddyfileFor({}), /:80 \{[\s\S]*reverse_proxy gate:8930/);
  assert.match(caddyfileFor({ domain: "gov.example.com" }), /^gov\.example\.com \{/);
});

test("plan describes the run without side effects", () => {
  const p = plan({ tier: 4, port: 9000, env: {} });
  assert.equal(p.tier, 4);
  assert.ok(p.services.includes("caddy") && p.services.includes("gate"));
  assert.equal(p.urls.studio, "http://localhost/"); // caddy fronts → no port in URL
  const p1 = plan({ tier: 1, port: 9000, env: {} });
  assert.equal(p1.urls.studio, "http://localhost:9000/"); // gate-only → direct port
});

test("urlsFor uses https when a domain + caddy are present", () => {
  assert.equal(urlsFor({ withCaddy: true, domain: "g.example" }).api, "https://g.example/v1");
});
