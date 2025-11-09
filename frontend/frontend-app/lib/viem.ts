// lib/viem.ts
import {
    createPublicClient,
    createWalletClient,
    Address,
    http,
    custom,
    type PublicClient,
    type WalletClient,
    type Account,
    type Chain, 
    type EIP1193Provider  
} from 'viem';

export const tenderlyOctantFork: Chain = {
  id: 8, // Tenderly fork chain ID
  name: 'Tenderly Octant Fork',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://virtual.mainnet.eu.rpc.tenderly.co/82c86106-662e-4d7f-a974-c311987358ff'],
    },
    public: {
      http: ['https://virtual.mainnet.eu.rpc.tenderly.co/82c86106-662e-4d7f-a974-c311987358ff'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Tenderly Explorer',
      url: 'https://dashboard.tenderly.co/explorer/vnet/82c86106-662e-4d7f-a974-c311987358ff',
    },
  },
};
 
const currentViemChain: Chain = tenderlyOctantFork;
const rpcUrl = currentViemChain.rpcUrls.default.http[0];

 
export const publicClient: PublicClient = createPublicClient({
  chain: currentViemChain,
  transport: http(rpcUrl),
});

/**
 *  
 *  
 * @param privyProvider  
 * @param privyAccountAddress  
 * @returns  
 * @throws 
 */
export function createViemWalletClientFromPrivy(
    privyProvider: EIP1193Provider,
    privyAccountAddress: Address
): WalletClient & { account: Account; chain: Chain } {
    if (!privyProvider) {
        throw new Error("Privy provider is not available.");
    }
    if (!privyAccountAddress) {
        throw new Error("Privy account address is not available.");
    }

    const walletClient = createWalletClient({
        account: privyAccountAddress, 
        chain: currentViemChain,      
        transport: custom(privyProvider), 
    });

    return walletClient as WalletClient & { account: Account; chain: Chain };
}