// hooks/useSwap.ts
'use client';

import { useState } from 'react';
import { Address, parseUnits, formatUnits } from 'viem';
import { publicClient } from '@/lib/viem';
import { CONTRACTS, TOKENS, POOL_FEE, PUBLIC_GOOD_FEE_BPS, BPS_DENOMINATOR, TokenSymbol } from '@/lib/contracts';

export interface SwapParams {
  tokenIn: TokenSymbol;
  tokenOut: TokenSymbol;
  amountIn: string;
  userAddress: Address;
  walletClient: any; // WalletClient from viem
}

export interface SwapQuote {
  amountIn: string;
  amountOut: string;
  publicGoodFee: string;
  amountAfterFee: string;
  priceImpact: string;
}

export function useSwap() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  /**
   * Calculate the public good fee (3%)
   */
  const calculatePublicGoodFee = (amountIn: string, decimals: number): { fee: string; amountAfterFee: string } => {
    const amountInWei = parseUnits(amountIn, decimals);
    const feeWei = (amountInWei * BigInt(PUBLIC_GOOD_FEE_BPS)) / BigInt(BPS_DENOMINATOR);
    const amountAfterFeeWei = amountInWei - feeWei;

    return {
      fee: formatUnits(feeWei, decimals),
      amountAfterFee: formatUnits(amountAfterFeeWei, decimals),
    };
  };

  /**
   * Get a quote for the swap (estimate output amount)
   */
  const getQuote = async (tokenIn: TokenSymbol, tokenOut: TokenSymbol, amountIn: string): Promise<SwapQuote | null> => {
    try {
      const tokenInData = TOKENS[tokenIn];
      const tokenOutData = TOKENS[tokenOut];

      // Calculate public good fee
      const { fee, amountAfterFee } = calculatePublicGoodFee(amountIn, tokenInData.decimals);

      // For now, use a simple 1:1 ratio for OUSD/USDC
      // In production, you'd call the Quoter contract
      let estimatedOutput = amountAfterFee;
      
      // Adjust for decimals difference (e.g., OUSD has 18, USDC has 6)
      if (tokenInData.decimals !== tokenOutData.decimals) {
        const amountAfterFeeWei = parseUnits(amountAfterFee, tokenInData.decimals);
        const adjusted = amountAfterFeeWei / BigInt(10 ** (tokenInData.decimals - tokenOutData.decimals));
        estimatedOutput = formatUnits(adjusted, tokenOutData.decimals);
      }

      return {
        amountIn,
        amountOut: estimatedOutput,
        publicGoodFee: fee,
        amountAfterFee,
        priceImpact: '0.1', // Simplified
      };
    } catch (err) {
      console.error('Error getting quote:', err);
      return null;
    }
  };

  /**
   * Execute the swap
   */
  const executeSwap = async (params: SwapParams): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const { tokenIn, tokenOut, amountIn, userAddress, walletClient } = params;
      
      const tokenInData = TOKENS[tokenIn];
      const tokenOutData = TOKENS[tokenOut];
      const amountInWei = parseUnits(amountIn, tokenInData.decimals);

      // Step 1: Approve Router to spend tokens
      console.log('Approving router...');
      const approveTx = await walletClient.writeContract({
        address: tokenInData.address,
        abi: CONTRACTS.octantUSD.abi as any, // Use ERC20 ABI
        functionName: 'approve',
        args: [CONTRACTS.router.address, amountInWei],
        account: userAddress,
      });

      // Wait for approval
      await publicClient.waitForTransactionReceipt({ hash: approveTx });
      console.log('Approval confirmed');

      // Step 2: Execute swap
      console.log('Executing swap...');
      const swapTx = await walletClient.writeContract({
        address: CONTRACTS.router.address,
        abi: CONTRACTS.router.abi as any,
        functionName: 'exactInputSingle',
        args: [
          {
            tokenIn: tokenInData.address,
            tokenOut: tokenOutData.address,
            fee: POOL_FEE,
            recipient: userAddress,
            amountIn: amountInWei,
            amountOutMinimum: 0n, // In production, calculate from slippage
            sqrtPriceLimitX96: 0n,
          },
        ],
        account: userAddress,
      });

      // Wait for swap confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: swapTx });
      console.log('Swap confirmed:', receipt);

      setTxHash(swapTx);
      return swapTx;
    } catch (err) {
      console.error('Swap error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Swap failed';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    executeSwap,
    getQuote,
    calculatePublicGoodFee,
    isLoading,
    error,
    txHash,
  };
}
