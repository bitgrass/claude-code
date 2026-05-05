export interface Eip1193ProviderLike {
  request: (args: { method: string; params?: any[] }) => Promise<unknown>;
}

export interface EvmTransactionReceipt {
  status?: string | number;
  transactionHash?: string;
}

export function isReceiptSuccess(receipt: EvmTransactionReceipt | null | undefined): boolean {
  if (!receipt) return false;
  if (receipt.status === undefined || receipt.status === null) return true;

  if (typeof receipt.status === "number") {
    return receipt.status !== 0;
  }

  const raw = receipt.status.trim().toLowerCase();
  if (raw === "0x0" || raw === "0") return false;
  if (raw === "0x1" || raw === "1") return true;
  try {
    return BigInt(raw) !== BigInt(0);
  } catch {
    return false;
  }
}

export async function waitForTransactionReceipt(
  provider: Eip1193ProviderLike,
  txHash: string,
  options?: { timeoutMs?: number; pollMs?: number }
): Promise<EvmTransactionReceipt> {
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const pollMs = options?.pollMs ?? 1_200;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const receipt = (await provider.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    })) as EvmTransactionReceipt | null;

    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  throw new Error("Timed out while waiting for transaction confirmation");
}
