/**
 * CDP Server Wallet helper (server-side only).
 *
 * Uses @coinbase/cdp-sdk Server Wallets API.
 * Wallet is identified by CDP_WALLET_NAME.
 */

import { CdpClient } from "@coinbase/cdp-sdk";

let client: CdpClient | null = null;
let configDiagnostics: {
  apiKeyIdSource: string;
  apiKeyIdPreview: string;
  apiKeySecretSource: string;
  apiKeySecretLength: number;
  walletSecretSource: string;
  walletSecretLength: number;
  walletNameSource: string;
  walletName: string;
} | null = null;

function normalizeEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;
  return unquoted.replace(/\\n/g, "\n");
}

function maskValue(value: string, visibleStart = 4, visibleEnd = 4): string {
  if (value.length <= visibleStart + visibleEnd) return value;
  return `${value.slice(0, visibleStart)}...${value.slice(-visibleEnd)}`;
}

function getEnvValue(names: string[]): { value: string | undefined; source: string } {
  for (const name of names) {
    const value = normalizeEnv(process.env[name]);
    if (value) return { value, source: name };
  }
  return { value: undefined, source: names.join(" | ") };
}

function getRequiredEnv(names: string[]): { value: string; source: string } {
  const found = getEnvValue(names);
  if (!found.value) {
    throw new Error(`Missing required env: ${found.source}`);
  }
  return { value: found.value, source: found.source };
}

function getResolvedConfig() {
  const apiKeyId = getRequiredEnv(["CDP_API_KEY_NAME", "CDP_API_KEY_ID"]);
  const apiKeySecret = getRequiredEnv([
    "CDP_API_KEY_PRIVATE_KEY",
    "CDP_API_KEY_SECRET",
  ]);
  const walletSecret = getRequiredEnv(["CDP_WALLET_SECRET"]);
  const walletName = getEnvValue(["CDP_WALLET_NAME"]);
  const resolvedWalletName = walletName.value || "spender";

  configDiagnostics = {
    apiKeyIdSource: apiKeyId.source,
    apiKeyIdPreview: maskValue(apiKeyId.value, 6, 6),
    apiKeySecretSource: apiKeySecret.source,
    apiKeySecretLength: apiKeySecret.value.length,
    walletSecretSource: walletSecret.source,
    walletSecretLength: walletSecret.value.length,
    walletNameSource: walletName.source,
    walletName: resolvedWalletName,
  };

  return {
    apiKeyId: apiKeyId.value,
    apiKeySecret: apiKeySecret.value,
    walletSecret: walletSecret.value,
    walletName: resolvedWalletName,
  };
}

function getCdpClient(): CdpClient {
  if (!client) {
    const config = getResolvedConfig();
    client = new CdpClient({
      apiKeyId: config.apiKeyId,
      apiKeySecret: config.apiKeySecret,
      walletSecret: config.walletSecret,
    });
  }
  return client;
}

export function getCdpWalletDiagnostics() {
  if (!configDiagnostics) {
    try {
      getResolvedConfig();
    } catch {
      return {
        configured: false,
        error: "CDP env is missing or malformed",
      } as const;
    }
  }
  return {
    configured: true,
    ...configDiagnostics,
  } as const;
}

export async function getAdminBaseAccount() {
  const cdp = getCdpClient();
  const { walletName: name } = getResolvedConfig();
  const account = await cdp.evm.getAccount({ name });
  return account.useNetwork("base");
}
