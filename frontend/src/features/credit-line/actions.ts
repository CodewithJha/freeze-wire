import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Hex,
} from 'viem';
import { gatedCreditLineAbi } from '@/lib/abis';
import { CC3_CHAIN_ID, CC3_RPC_URL, CREDIT_LINE_ADDRESS } from '@/lib/constants';
import type { CreditActionId } from '@/components/credit/CreditAccessMatrix';

const creditcoinTestnet = {
  id: CC3_CHAIN_ID,
  name: 'Creditcoin Testnet',
  nativeCurrency: { name: 'CTC', symbol: 'CTC', decimals: 18 },
  rpcUrls: { default: { http: [CC3_RPC_URL] } },
} as const;

function getEthereum(): { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } | null {
  const eth = (window as unknown as { ethereum?: unknown }).ethereum;
  if (!eth || typeof eth !== 'object') return null;
  return eth as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
}

export function creditLineConfigured(): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(CREDIT_LINE_ADDRESS);
}

export async function attemptCreditAction(
  action: CreditActionId,
  account: Address,
): Promise<string> {
  if (!creditLineConfigured()) {
    return mapSimulated(action);
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
      return `CONTRACT REVERT Restricted — ${action.toUpperCase()} rejected by GatedCreditLine.`;
    }
    if (/InsufficientAvailable/i.test(msg)) {
      return `CONTRACT REVERT InsufficientAvailable — ${action.toUpperCase()} (balances, not eligibility).`;
    }
    return `CONTRACT CALL FAILED — ${shortErr(msg)}`;
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
    return `SIMULATION OK — connect a wallet to broadcast ${functionName}.`;
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
  return `TX SUBMITTED ${hash}`;
}

function mapSimulated(action: CreditActionId): string {
  const gated =
    action === 'draw' ||
    action === 'protectedTransfer' ||
    action === 'escrowLock' ||
    action === 'escrowRelease';
  if (gated) {
    return `CREDIT LINE UNCONFIGURED — UI marks gated actions blocked when RESTRICTED; configure VITE_CREDIT_LINE_ADDRESS for live Restricted revert.`;
  }
  return `CREDIT LINE UNCONFIGURED — ${action.toUpperCase()} remains available under selective gating (ledger still authoritative).`;
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
