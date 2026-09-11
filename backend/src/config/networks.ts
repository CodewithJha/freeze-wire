import { z } from 'zod';

const hexAddress = z.string().regex(/^0x[0-9a-fA-F]{40}$/);

export const networkProfileSchema = z
  .object({
    name: z.string().min(1),
    cc3ChainId: z.number().int().positive(),
    cc3RpcUrl: z.string().min(1).optional(),
    cc3Explorer: z.string().min(1).optional(),
    sourceChainKey: z.number().int().nonnegative().optional(),
    sourceChainName: z.string().optional(),
    sepoliaChainKey: z.number().int().nonnegative().optional(),
    blockProver: hexAddress.optional(),
    chainInfo: z.string().optional(),
    decoder: hexAddress.optional(),
    proofBuilderUrl: z.string().nullable().optional(),
    sourceUsdc: hexAddress.optional(),
    proofMinHeight: z.number().int().nonnegative().optional(),
    proofMaxHeight: z.number().int().nonnegative().optional(),
    demoSourceTx: z.string().optional(),
    note: z.string().optional(),
    notes: z.array(z.string()).optional(),
  })
  .passthrough();

export const networksFileSchema = z
  .object({
    $comment: z.string().optional(),
    local: networkProfileSchema,
    'cc3-testnet': networkProfileSchema,
    'cc3-mainnet': networkProfileSchema,
  })
  .passthrough();

export type NetworkProfile = z.infer<typeof networkProfileSchema>;
export type NetworksFile = z.infer<typeof networksFileSchema>;
