# Fixtures

`demo-txbytes.hex` is the Proof Builder `txBytes` field for demo tx
`0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787`
as returned by GET `/api/v1/proof-by-tx/3/{hash}` on 2026-09-10.
It is a public Ethereum receipt encoding, not a fabricated proof.
Live Merkle/continuity bundles are fetched at test time (T-INT-LIVE), not treated as an authorization oracle.
