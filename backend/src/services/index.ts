export { fetchProofByTx, type NormalizedProof } from './prove.js';
export {
  proveByTx,
  relaySubmitProof,
  buildSubmitProofCalldata,
  encodeSubmitProof,
  normalizeProofFields,
  type ProveApiResponse,
  type RelayRequestBody,
  type RelaySuccess,
} from './relay.js';
export { discoverCandidates, type DiscoverCandidate } from './discover.js';
export { checkHealth, readStatus, evidenceDemo } from './status.js';
