// hooks/useTreasury.ts
'use client';

import { useState, useEffect } from 'react';
import { Address, formatUnits } from 'viem';
import { publicClient } from '@/lib/viem';
import { CONTRACTS } from '@/lib/contracts';

export function useTreasury() {
  const [totalOUSDCollected, setTotalOUSDCollected] = useState<string>('0');
  const [treasuryBalance, setTreasuryBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTreasuryData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get total contributions from treasury contract
        const contributions = await publicClient.readContract({
          address: CONTRACTS.treasury.address,
          abi: CONTRACTS.treasury.abi as any,
          functionName: 'getContributions',
          args: [CONTRACTS.octantUSD.address],
        });

        // Get current treasury balance
        const balance = await publicClient.readContract({
          address: CONTRACTS.octantUSD.address,
          abi: CONTRACTS.octantUSD.abi as any,
          functionName: 'balanceOf',
          args: [CONTRACTS.treasury.address],
        });

        setTotalOUSDCollected(formatUnits(contributions as bigint, 18));
        setTreasuryBalance(formatUnits(balance as bigint, 18));
      } catch (err) {
        console.error('Error fetching treasury data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch treasury data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTreasuryData();

    // Refresh every 15 seconds
    const interval = setInterval(fetchTreasuryData, 15000);
    return () => clearInterval(interval);
  }, []);

  return {
    totalOUSDCollected,
    treasuryBalance,
    isLoading,
    error,
  };
}
