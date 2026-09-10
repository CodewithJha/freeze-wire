# ADR-0002: Foundry

- Status: Accepted
- Date: 2026-09-10

## Context

Need fast Solidity unit tests, scripting, and mainnet-fork-like fixtures for decoder tests.

## Decision

Use Foundry (`forge`, `cast`, `anvil`).

## Alternatives

Hardhat: richer JS tooling, slower tight test loops, extra TS glue for the same consumer-check tests.

## Why rejected

Project calendar favors `forge test` speed and official-example alignment.
