/** OpenAPI `SingleContinuityResponse` from Proof Gen API Server 1.0. Do not invent fields. */

export type MerkleProofEntry = {
  hash: string;
  isLeft: boolean;
};

export type TransactionMerkleProof = {
  root: string;
  siblings: MerkleProofEntry[];
};

export type ContinuityProof = {
  lowerEndpointDigest: string;
  roots: string[];
};

export type SingleContinuityResponse = {
  chainKey: number;
  headerNumber: number;
  txIndex: number;
  continuityProof: ContinuityProof;
  merkleProof: TransactionMerkleProof;
  cached: boolean;
  generatedAt: string;
  txBytes?: string | null;
  txHash?: string | null;
};

export type HealthCheckResponse = {
  status: string;
  cc3_rpc_connected: boolean;
  eth_rpc_connected: boolean;
  uptime_seconds: number;
};

export type AttestedHeightResponse = {
  attestedHeight: number | null;
};

export type ProofBuilderErrorBody = {
  code: string;
  message: string;
  retriable: boolean;
  block_number?: number | null;
  last_attested_block?: number | null;
};
