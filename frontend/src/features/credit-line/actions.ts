import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Hex,
} from 'viem';
import { gatedCreditLineAbi } from '@/lib/abis';
import { CC3_CHAIN_ID } from '@/lib/constants';
import {
  addressesConfigured,
  CREDIT_LINE_ADDRESS,
  CC3_RPC_URL,
  resolveDeploymentMode,
  type DeploymentMode,
} from '@/lib/deployment';
import type { CreditActionId } from '@/components/credit/CreditAccessMatrix';
import { WalletBroadcastError } from '@/lib/walletErrors';

export { WalletBroadcastError } from '@/lib/walletErrors';
export type { WalletBroadcastErrorCode } from '@/lib/walletErrors';

const creditcoinTestnet = {
  id: CC3_CHAIN_ID,
  name: 'Creditcoin Testnet',
  nativeCurrency: { name: 'CTC', symbol: 'CTC', decimals: 18 },
  rpcUrls: { default: { http: [CC3_RPC_URL] } },
} as const;

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getEthereum(): EthereumProvider | null {
  const eth = (window as unknown as { ethereum?: unknown }).ethereum;
  if (!eth || typeof eth !== 'object') return null;
  const provider = eth as { request?: unknown };
  if (typeof provider.request !== 'function') return null;
  return eth as EthereumProvider;
}

function asWalletError(err: unknown): WalletBroadcastError {
  if (err instanceof WalletBroadcastError) return err;
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  const code =
    typeof err === 'object' && err && 'code' in err
      ? Number((err as { code: unknown }).code)
      : NaN;

  if (
    code === 4001 ||
    /user rejected|user denied|rejected the request|denied transaction|action_rejected/i.test(raw)
  ) {
    return new WalletBroadcastError(
      'WALLET_REJECTED',
      'WALLET REJECTED — signature or connection was declined.',
    );
  }
  if (
    code === 4902 ||
    /Unrecognized chain|chain has not been added|wallet_addEthereumChain/i.test(raw)
  ) {
    return new WalletBroadcastError(
      'WRONG_NETWORK',
      'WRONG NETWORK — add Creditcoin Testnet (CC3) in your wallet, then retry.',
    );
  }
  if (/chain mismatch|wrong chain|not on the expected|switch.*chain/i.test(raw)) {
    return new WalletBroadcastError(
      'WRONG_NETWORK',
      'WRONG NETWORK — switch your wallet to Creditcoin Testnet (CC3), then retry.',
    );
  }
  if (/insufficient funds|exceeds balance|gas required exceeds/i.test(raw)) {
    return new WalletBroadcastError(
      'INSUFFICIENT_FUNDS',
      'INSUFFICIENT FUNDS — fund the wallet with CTC for gas on Creditcoin Testnet.',
    );
  }
  if (/reverted|execution reverted|status.*reverted/i.test(raw)) {
    return new WalletBroadcastError(
      'TX_REVERTED',
      'SUBMIT PROOF REVERTED — transaction mined but failed on Creditcoin.',
    );
  }
  if (/fetch|http|network|timeout|econnrefused|rpc|failed to fetch/i.test(lower)) {
    return new WalletBroadcastError(
      'RPC_FAILED',
      'CREDITCOIN RPC UNAVAILABLE — could not confirm the transaction.',
    );
  }
  return new WalletBroadcastError(
    'BROADCAST_FAILED',
    'BROADCAST FAILED — wallet could not submit submitProof.',
  );
}

async function ensureCc3Chain(eth: EthereumProvider): Promise<void> {
  const chainHex = `0x${CC3_CHAIN_ID.toString(16)}`;
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainHex }],
    });
    return;
  } catch (err) {
    const code =
      typeof err === 'object' && err && 'code' in err
        ? Number((err as { code: unknown }).code)
        : NaN;
    const msg = err instanceof Error ? err.message : String(err);
    if (
      code !== 4902 &&
      !/Unrecognized chain|chain has not been added|wallet_addEthereumChain/i.test(msg)
    ) {
      throw err;
    }
  }

  await eth.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: chainHex,
        chainName: creditcoinTestnet.name,
        nativeCurrency: creditcoinTestnet.nativeCurrency,
        rpcUrls: [CC3_RPC_URL],
        blockExplorerUrls: undefined,
      },
    ],
  });
}

/** @deprecated Prefer resolveDeploymentMode / addressesConfigured */
export function creditLineConfigured(): boolean {
  return addressesConfigured();
}

export function deploymentMode(): DeploymentMode {
  return resolveDeploymentMode();
}

export async function attemptCreditAction(
  action: CreditActionId,
  account: Address,
): Promise<string> {
  const mode = resolveDeploymentMode();
  if (mode === 'NOT_DEPLOYED') {
    return 'NOT_DEPLOYED — credit-line addresses are not configured; on-chain enforcement is not active.';
  }
  if (mode === 'SIMULATION') {
    return mapSimulation(action);
  }

  const address = CREDIT_LINE_ADDRESS as Address;
  const publicClient = createPublicClient({
    chain: creditcoinTestnet,
    transport: http(CC3_RPC_URL),
  });

  const amount = 1n;
  const zeroId = ('0x' + '00'.repeat(32)) as Hex;
  const zeroTo = '0x0000000000000000000000000000000000000001' as Address;

  try {
    if (action === 'draw') {
      await publicClient.simulateContract({
        address,
        abi: gatedCreditLineAbi,
        functionName: 'draw',
        args: [amount],
        account,
      });
      return await writeIfWallet(address, 'draw', [amount], account);
    }
    if (action === 'repay') {
      await publicClient.simulateContract({
        address,
        abi: gatedCreditLineAbi,
        functionName: 'repay',
        args: [amount],
        account,
      });
      return await writeIfWallet(address, 'repay', [amount], account);
    }
    if (action === 'withdrawUnused') {
      await publicClient.simulateContract({
        address,
        abi: gatedCreditLineAbi,
        functionName: 'withdraw',
        args: [amount],
        account,
      });
      return await writeIfWallet(address, 'withdraw', [amount], account);
    }
    if (action === 'protectedTransfer') {
      await publicClient.simulateContract({
        address,
        abi: gatedCreditLineAbi,
        functionName: 'protectedTransfer',
        args: [zeroTo, amount],
        account,
      });
      return await writeIfWallet(address, 'protectedTransfer', [zeroTo, amount], account);
    }
    if (action === 'escrowLock') {
      await publicClient.simulateContract({
        address,
        abi: gatedCreditLineAbi,
        functionName: 'lockEscrow',
        args: [zeroId, amount],
        account,
      });
      return await writeIfWallet(address, 'lockEscrow', [zeroId, amount], account);
    }
    await publicClient.simulateContract({
      address,
      abi: gatedCreditLineAbi,
      functionName: 'releaseEscrow',
      args: [zeroId, zeroTo],
      account,
    });
    return await writeIfWallet(address, 'releaseEscrow', [zeroId, zeroTo], account);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/Restricted/i.test(msg)) {
      return `LIVE REVERT Restricted — ${action.toUpperCase()} rejected by GatedCreditLine.`;
    }
    if (/InsufficientAvailable/i.test(msg)) {
      return `LIVE REVERT InsufficientAvailable — ${action.toUpperCase()} (balances, not eligibility).`;
    }
    if (/fetch|HTTP|network|timeout|ECONNREFUSED|RPC/i.test(msg)) {
      return `UNAVAILABLE — CC3 RPC failed for ${action.toUpperCase()}.`;
    }
    if (/PRIVATE_KEY|RELAY_|API[_-]?KEY|https?:\/\/|\/Users\/|ECONNREFUSED/i.test(msg)) {
      return `LIVE CALL FAILED — ${action.toUpperCase()} rejected by chain or wallet.`;
    }
    return `LIVE CALL FAILED — ${shortErr(msg)}`;
  }
}

async function writeIfWallet(
  address: Address,
  functionName: 'draw' | 'repay' | 'withdraw' | 'protectedTransfer' | 'lockEscrow' | 'releaseEscrow',
  args: readonly unknown[],
  account: Address,
): Promise<string> {
  const eth = getEthereum();
  if (!eth) {
    return `LIVE SIMULATION OK — connect a wallet to broadcast ${functionName} on CC3.`;
  }
  const wallet = createWalletClient({
    account,
    chain: creditcoinTestnet,
    transport: custom(eth),
  });
  const hash = await wallet.writeContract({
    address,
    abi: gatedCreditLineAbi,
    functionName,
    args: args as never,
    account,
    chain: creditcoinTestnet,
  });
  return `LIVE TX SUBMITTED ${hash}`;
}

function mapSimulation(action: CreditActionId): string {
  const gated =
    action === 'draw' ||
    action === 'protectedTransfer' ||
    action === 'escrowLock' ||
    action === 'escrowRelease';
  if (gated) {
    return `SIMULATION — gated ${action.toUpperCase()} shown blocked under RESTRICTED (not on-chain).`;
  }
  return `SIMULATION — ${action.toUpperCase()} remains available under selective gating (not on-chain).`;
}

function shortErr(msg: string): string {
  return msg.length > 160 ? `${msg.slice(0, 157)}…` : msg;
}

export async function connectWallet(): Promise<Address | null> {
  const eth = getEthereum();
  if (!eth) return null;
  const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
  const first = accounts[0];
  if (!first) return null;
  return first as Address;
}

export type BroadcastProgress =
  | 'AWAITING_WALLET'
  | 'BROADCASTING'
  | 'CONFIRMING';

/**
 * Broadcast prepared submitProof calldata via the browser wallet.
 * Resolves only after a confirmed receipt — never treat prepare/signature/hash as success.
 */
export async function broadcastSubmitProofCalldata(params: {
  to: Address;
  data: Hex;
  onProgress?: (phase: BroadcastProgress) => void;
}): Promise<{ hash: Hex }> {
  const eth = getEthereum();
  if (!eth) {
    throw new WalletBroadcastError(
      'NO_WALLET',
      'NO WALLET — install or unlock a browser wallet compatible with Creditcoin Testnet.',
    );
  }

  params.onProgress?.('AWAITING_WALLET');

  try {
    const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
    const account = accounts[0] as Address | undefined;
    if (!account) {
      throw new WalletBroadcastError(
        'NO_WALLET',
        'NO WALLET — no account selected in the browser wallet.',
      );
    }

    await ensureCc3Chain(eth);

    const wallet = createWalletClient({
      account,
      chain: creditcoinTestnet,
      transport: custom(eth),
    });
    const publicClient = createPublicClient({
      chain: creditcoinTestnet,
      transport: http(CC3_RPC_URL),
    });

    params.onProgress?.('BROADCASTING');
    const hash = await wallet.sendTransaction({
      to: params.to,
      data: params.data,
      account,
      chain: creditcoinTestnet,
    });

    // Hash alone is not success — wait for a successful receipt.
    params.onProgress?.('CONFIRMING');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') {
      throw new WalletBroadcastError(
        'TX_REVERTED',
        'SUBMIT PROOF REVERTED — transaction mined but failed on Creditcoin.',
      );
    }
    return { hash };
  } catch (err) {
    throw asWalletError(err);
  }
}
