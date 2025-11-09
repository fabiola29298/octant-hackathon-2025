// hooks/useTokenBalance.ts
'use client';

import { useState, useEffect } from 'react';
import { Address, formatUnits } from 'viem';
import { publicClient } from '@/lib/viem';
import { CONTRACTS, TOKENS, TokenSymbol } from '@/lib/contracts';

export function useTokenBalance(tokenSymbol: TokenSymbol, userAddress?: Address) {
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress) {
      setBalance('0');
      return;
    }

    const fetchBalance = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = TOKENS[tokenSymbol];
        const contractAddress = token.address;
        const abi = tokenSymbol === 'OUSD' 
          ? CONTRACTS.octantUSD.abi 
          : CONTRACTS.weth.abi; // WETH and USDC use same ERC20 ABI

        const balanceRaw = await publicClient.readContract({
          address: contractAddress,
          abi: abi as any,
          functionName: 'balanceOf',
          args: [userAddress],
        });

        const formatted = formatUnits(balanceRaw as bigint, token.decimals);
        setBalance(formatted);
      } catch (err) {
        console.error(`Error fetching ${tokenSymbol} balance:`, err);
        setError(err instanceof Error ? err.message : 'Failed to fetch balance');
        setBalance('0');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();

    // Refresh balance every 10 seconds
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [tokenSymbol, userAddress]);

  return { balance, isLoading, error };
}
