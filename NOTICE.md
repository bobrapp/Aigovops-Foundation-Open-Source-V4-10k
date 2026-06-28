# NOTICE — provenance & licensing

AiGovOps Foundation — Open Source v4 is released under the [MIT License](./LICENSE).

## Original work only

All source code, documentation, and the regulatory corpus in this repository are **original work**
authored for this project. No third-party copyrighted text is reproduced anywhere in the tree.

## The regulatory corpus

`packages/corpus` indexes AI-governance requirements drawn from **primary public sources** — the text of
laws and regulations and published standards. For each requirement we store:

- an **original one-line paraphrase** written in our own words, and
- a **citation** to the primary source (a regulation article number or a published-standard reference).

The underlying laws, regulations, and government frameworks (e.g. EU AI Act, GDPR, NIST AI RMF, FERPA,
HIPAA, Colorado SB 24-205, NYC Local Law 144) are public; their citations are facts. We do **not** copy
prose from any commentary, textbook, or other copyrighted secondary source. Contributions to the corpus
must follow the same rule: **cite the primary source, paraphrase in your own words.**

## Open-source backends

Production backends named in `INTEROP.md` and `packages/adapters` (OPA, Prometheus, Keycloak, OpenSearch,
Kong, MLflow, Airflow, etc.) are independent projects under their own licenses. This repository integrates
with them via adapters; it does not vendor or redistribute their code.
