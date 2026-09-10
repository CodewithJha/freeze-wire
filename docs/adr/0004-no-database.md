# ADR-0004: No application database

- Status: Accepted
- Date: 2026-09-10

## Decision

On-chain state is the only durable eligibility/credit store. Worker memory is ephemeral.

## Alternatives

Postgres for discovery history.

## Why rejected

A DB becomes a competing oracle and a demo lie (“our API says restricted”). Explorers are the index.
