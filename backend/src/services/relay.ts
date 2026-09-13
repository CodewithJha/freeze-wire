import { encodeFunctionData, decodeEventLog, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { AppConfig } from '../config/resolve.js';
import type { ProofBuilderClient } from '../clients/proofBuilder.js';
import type { Cc3RpcClient, FeeEstimate } from '../clients/cc3Rpc.js';
import { ProofBuilderError } from '../clients/proofBuilder.js';
import { eligibilityLedgerAbi } from '../domain/abi.js';
import { ApiError, ApiErrorCode } from '../domain/errors.js';
import { assertBytes32, assertTxHash, normalizeHex } from '../domain/hex.js';
import type { SingleContinuityResponse } from '../domain/proof.js';
import type { Logger } from '../observability/logger.js';
import { fetchProofByTx } from './prove.js';

export type ProveApiResponse = {
  chainKey: number;
  headerNumber: number;
  txIndex: number;
  txBytes: string;
  merkleProof: SingleContinuityResponse['merkleProof'];
  continuityProof: SingleContinuityResponse['continuityProof'];
  attestedHeight: number | null;
  txHash?: string | null;
  cached?: boolean;
  generatedAt?: string;
};

export type RelayRequestBody = {
  txHash?: string;
  chainKey?: number;
  headerNumber?: number;
  txIndex?: number;
  txBytes?: string;
  merkleProof?: SingleContinuityResponse['merkleProof'];
  continuityProof?: SingleContinuityResponse['continuityProof'];
};

export type RelaySuccess = {
  ctcTx: string;
  restricted: string[];
  restored: string[];
};

export type SubmitProofCalldata = {
  to: string;
  data: string;
  /** Original txBytes hex after normalize — for integrity checks. */
  encodedTransaction: string;
};

function mapProofBuilderError(err: ProofBuilderError): ApiError {
  if (err.code === 'BlockNotReady' || err.httpStatus === 422) {
    return new ApiError(ApiErrorCode.BLOCK_NOT_READY, err.message, 422, err.retriable);
  }
  if (err.httpStatus === 404 || err.code === 'TxNotFound' || err.code === 'NotFound') {
    return new ApiError(ApiErrorCode.TX_NOT_FOUND, err.message, 404, false);
  }
  return new ApiError(ApiErrorCode.PROOF_BUILDER_FAILED, err.message, 502, err.retriable);
}

export function normalizeProofFields(bundle: {
  chainKey: number;
  headerNumber: number;
  txIndex?: number;
  txBytes: string;
  merkleProof: SingleContinuityResponse['merkleProof'];
  continuityProof: SingleContinuityResponse['continuityProof'];
}): {
  chainKey: bigint;
  height: bigint;
  encodedTransaction: `0x${string}`;
  merkleProof: {
    root: `0x${string}`;
    siblings: { hash: `0x${string}`; isLeft: boolean }[];
  };
  continuityProof: {
    lowerEndpointDigest: `0x${string}`;
    roots: `0x${string}`[];
  };
} {
  const encodedTransaction = normalizeHex(bundle.txBytes, 'txBytes');
  if (encodedTransaction === '0x') {
    throw new ApiError(ApiErrorCode.INVALID_REQUEST, 'Empty txBytes must not be submitted', 400);
  }
  return {
    chainKey: BigInt(bundle.chainKey),
    height: BigInt(bundle.headerNumber),
    encodedTransaction,
    merkleProof: {
      root: assertBytes32(bundle.merkleProof.root, 'merkleProof.root'),
      siblings: bundle.merkleProof.siblings.map((s, i) => ({
        hash: assertBytes32(s.hash, `merkleProof.siblings[${i}].hash`),
        isLeft: Boolean(s.isLeft),
      })),
    },
    continuityProof: {
      lowerEndpointDigest: assertBytes32(
        bundle.continuityProof.lowerEndpointDigest,
        'continuityProof.lowerEndpointDigest',
      ),
      roots: bundle.continuityProof.roots.map((r, i) =>
        assertBytes32(r, `continuityProof.roots[${i}]`),
      ),
    },
  };
}

export function encodeSubmitProof(args: ReturnType<typeof normalizeProofFields>): `0x${string}` {
  return encodeFunctionData({
    abi: eligibilityLedgerAbi,
    functionName: 'submitProof',
    args: [args.chainKey, args.height, args.encodedTransaction, args.merkleProof, args.continuityProof],
  });
}

export async function proveByTx(
  client: ProofBuilderClient,
  config: AppConfig,
  txHashRaw: string,
  log?: Logger,
): Promise<ProveApiResponse> {
  const txHash = assertTxHash(txHashRaw);
  let attestedHeight: number | null = null;
  try {
    const height = await client.attestedHeight(config.attestcoinChainKey);
    attestedHeight = height.attestedHeight;
  } catch {
    /* optional coordination; prove-by-tx remains authoritative */
  }

  try {
    const { bundle } = await fetchProofByTx(client, config.attestcoinChainKey, txHash, log);
    if (bundle.chainKey !== config.attestcoinChainKey) {
      throw new ApiError(
        ApiErrorCode.WRONG_CHAIN,
        `Proof chainKey ${bundle.chainKey} != expected ${config.attestcoinChainKey}`,
        400,
        false,
      );
    }
    const normalized = normalizeProofFields({
      chainKey: bundle.chainKey,
      headerNumber: bundle.headerNumber,
      txIndex: bundle.txIndex,
      txBytes: bundle.txBytes!,
      merkleProof: bundle.merkleProof,
      continuityProof: bundle.continuityProof,
    });
    return {
      chainKey: bundle.chainKey,
      headerNumber: bundle.headerNumber,
      txIndex: bundle.txIndex,
      txBytes: normalized.encodedTransaction,
      merkleProof: {
        root: normalized.merkleProof.root,
        siblings: normalized.merkleProof.siblings,
      },
      continuityProof: {
        lowerEndpointDigest: normalized.continuityProof.lowerEndpointDigest,
        roots: normalized.continuityProof.roots,
      },
      attestedHeight,
      txHash: bundle.txHash ?? txHash,
      cached: bundle.cached,
      generatedAt: bundle.generatedAt,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof ProofBuilderError) throw mapProofBuilderError(err);
    if (err instanceof Error && err.message.includes('Empty txBytes')) {
      throw new ApiError(ApiErrorCode.INVALID_REQUEST, err.message, 400);
    }
    throw new ApiError(
      ApiErrorCode.PROOF_BUILDER_FAILED,
      err instanceof Error ? err.message : 'Proof Builder failed',
      502,
      true,
    );
  }
}

export function buildSubmitProofCalldata(
  config: AppConfig,
  proof: {
    chainKey: number;
    headerNumber: number;
    txBytes: string;
    merkleProof: SingleContinuityResponse['merkleProof'];
    continuityProof: SingleContinuityResponse['continuityProof'];
  },
): SubmitProofCalldata {
  if (!config.ledgerAddress) {
    throw new ApiError(
      ApiErrorCode.RELAY_DISABLED,
      'LEDGER_ADDRESS not configured; cannot encode submitProof destination',
      404,
      false,
    );
  }
  const normalized = normalizeProofFields(proof);
  const data = encodeSubmitProof(normalized);
  return {
    to: config.ledgerAddress,
    data,
    encodedTransaction: normalized.encodedTransaction,
  };
}

async function resolveRelayProof(
  body: RelayRequestBody,
  client: ProofBuilderClient,
  config: AppConfig,
  log?: Logger,
): Promise<{
  chainKey: number;
  headerNumber: number;
  txBytes: string;
  merkleProof: SingleContinuityResponse['merkleProof'];
  continuityProof: SingleContinuityResponse['continuityProof'];
}> {
  const hasFull =
    body.txBytes &&
    body.merkleProof &&
    body.continuityProof &&
    body.chainKey !== undefined &&
    body.headerNumber !== undefined;

  if (hasFull) {
    return {
      chainKey: body.chainKey!,
      headerNumber: body.headerNumber!,
      txBytes: body.txBytes!,
      merkleProof: body.merkleProof!,
      continuityProof: body.continuityProof!,
    };
  }

  if (!body.txHash) {
    throw new ApiError(
      ApiErrorCode.INVALID_REQUEST,
      'Relay requires txHash or full prove payload fields',
      400,
    );
  }

  const proved = await proveByTx(client, config, body.txHash, log);
  return {
    chainKey: proved.chainKey,
    headerNumber: proved.headerNumber,
    txBytes: proved.txBytes,
    merkleProof: proved.merkleProof,
    continuityProof: proved.continuityProof,
  };
}

function serializeTx(params: {
  chainId: number;
  nonce: number;
  to: `0x${string}`;
  data: Hex;
  gas: bigint;
  fees: FeeEstimate;
}): Parameters<ReturnType<typeof privateKeyToAccount>['signTransaction']>[0] {
  if (params.fees.type === 'eip1559') {
    return {
      to: params.to,
      data: params.data,
      chainId: params.chainId,
      nonce: params.nonce,
      gas: params.gas,
      maxFeePerGas: params.fees.maxFeePerGas,
      maxPriorityFeePerGas: params.fees.maxPriorityFeePerGas,
      type: 'eip1559',
    };
  }
  return {
    to: params.to,
    data: params.data,
    chainId: params.chainId,
    nonce: params.nonce,
    gas: params.gas,
    gasPrice: params.fees.gasPrice,
    type: 'legacy',
  };
}

export async function relaySubmitProof(options: {
  body: RelayRequestBody;
  config: AppConfig;
  proofClient: ProofBuilderClient;
  cc3: Cc3RpcClient;
  log?: Logger;
}): Promise<RelaySuccess | { disabled: true; submitProof: { to: string; data: string } }> {
  const { body, config, proofClient, cc3, log } = options;
  const proof = await resolveRelayProof(body, proofClient, config, log);
  const calldata = buildSubmitProofCalldata(config, proof);

  // Integrity: encoded txBytes must round-trip without truncation.
  const recheck = normalizeProofFields(proof);
  if (recheck.encodedTransaction !== calldata.encodedTransaction) {
    throw new ApiError(ApiErrorCode.INVALID_REQUEST, 'Proof byte normalization mismatch', 500, false);
  }

  if (!config.relayPrivateKey) {
    log?.info('relay.disabled', { to: calldata.to, dataLen: calldata.data.length });
    throw new ApiError(
      ApiErrorCode.RELAY_DISABLED,
      'Worker relay unavailable; use client wallet submitProof',
      404,
      false,
      {
        submitProof: { to: calldata.to, data: calldata.data },
      },
    );
  }

  const account = privateKeyToAccount(config.relayPrivateKey);
  const chainId = await cc3.chainId();
  if (chainId !== config.cc3ChainId) {
    throw new ApiError(
      ApiErrorCode.WRONG_CHAIN,
      `RPC chainId ${chainId} != expected ${config.cc3ChainId}`,
      502,
      false,
    );
  }

  let gas: bigint;
  try {
    gas = await cc3.estimateGas(calldata.to, calldata.data, account.address);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      ApiErrorCode.GAS_ESTIMATION_FAILED,
      err instanceof Error ? err.message : 'estimateGas failed',
      502,
      true,
    );
  }
  const gasWithMargin = BigInt(Math.ceil(Number(gas) * config.gasLimitMultiplier));
  const fees = await cc3.getFeeEstimate();
  const nonce = await cc3.getTransactionCount(account.address);

  const tx = serializeTx({
    chainId: config.cc3ChainId,
    nonce,
    to: calldata.to as `0x${string}`,
    data: calldata.data as Hex,
    gas: gasWithMargin,
    fees,
  });

  let signed: Hex;
  try {
    signed = await account.signTransaction(tx);
  } catch (err) {
    throw new ApiError(
      ApiErrorCode.TRANSACTION_REJECTED,
      err instanceof Error ? err.message : 'sign failed',
      502,
      false,
    );
  }

  const ctcTx = await cc3.sendRawTransaction(signed);
  log?.info('relay.broadcast', {
    ctcTx,
    gas: gasWithMargin.toString(),
    feeType: fees.type,
    from: account.address,
  });

  // Poll receipt briefly; do not invent success if missing.
  let receipt = null;
  for (let i = 0; i < 30; i += 1) {
    receipt = await cc3.getTransactionReceipt(ctcTx);
    if (receipt) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!receipt) {
    throw new ApiError(
      ApiErrorCode.TRANSACTION_BROADCAST_FAILED,
      `Broadcast ${ctcTx} but receipt not observed`,
      502,
      true,
    );
  }
  if (receipt.status === '0x0') {
    throw new ApiError(ApiErrorCode.CONTRACT_REVERT, 'submitProof reverted', 400, false, {
      error: 'status=0x0',
    });
  }

  const restricted: string[] = [];
  const restored: string[] = [];
  for (const logItem of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: eligibilityLedgerAbi,
        data: logItem.data as Hex,
        topics: logItem.topics as [Hex, ...Hex[]],
      });
      if (decoded.eventName === 'Restricted') {
        restricted.push(String(decoded.args.account).toLowerCase());
      } else if (decoded.eventName === 'Restored') {
        restored.push(String(decoded.args.account).toLowerCase());
      }
    } catch {
      /* ignore non-ledger logs */
    }
  }

  return { ctcTx, restricted, restored };
}
