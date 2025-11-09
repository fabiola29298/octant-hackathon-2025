// app/swap/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WalletConnectButton } from '@/components/wallet-connect-button';
import { TokenSelector } from '@/components/token-selector';
import { ArrowDown, Loader2, ExternalLink } from 'lucide-react';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { useSwap, SwapQuote } from '@/hooks/useSwap';
import { createViemWalletClientFromPrivy } from '@/lib/viem';
import { TOKENS, TokenSymbol } from '@/lib/contracts';
import { Address } from 'viem';

export default function SwapPage() {
  const { authenticated, user } = usePrivy();
  const userAddress = user?.wallet?.address as Address | undefined;

  const [tokenIn, setTokenIn] = useState<TokenSymbol>('OUSD');
  const [tokenOut, setTokenOut] = useState<TokenSymbol>('WETH');
  const [amountIn, setAmountIn] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);

  const { balance: balanceIn } = useTokenBalance(tokenIn, userAddress);
  const { balance: balanceOut } = useTokenBalance(tokenOut, userAddress);
  const { executeSwap, getQuote, isLoading, error, txHash } = useSwap();

  // Get quote when amount changes
  useEffect(() => {
    if (amountIn && parseFloat(amountIn) > 0) {
      getQuote(tokenIn, tokenOut, amountIn).then(setQuote);
    } else {
      setQuote(null);
    }
  }, [amountIn, tokenIn, tokenOut]);

  const handleSwap = async () => {
    if (!authenticated || !user?.wallet?.address || !amountIn) {
      return;
    }

    try {
      // Get Privy provider
      const provider = await user.wallet.getEthereumProvider();
      const walletClient = createViemWalletClientFromPrivy(provider, user.wallet.address as Address);

      await executeSwap({
        tokenIn,
        tokenOut,
        amountIn,
        userAddress: user.wallet.address as Address,
        walletClient,
      });
    } catch (err) {
      console.error('Swap failed:', err);
    }
  };

  const handleMaxClick = () => {
    setAmountIn(balanceIn);
  };

  const switchTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn('');
    setQuote(null);
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-semibold">OctantUSD Swap</h2>
          <WalletConnectButton />
        </div>

        {/* Swap Card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>
              <h3 className="text-xl font-semibold">Swap Tokens</h3>
              <p className="text-sm text-zinc-400 mt-1">
                3% of every swap goes to public good 🌍
              </p>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Token In */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-sm font-medium text-zinc-400">
                  You pay
                </label>
                <span className="text-sm text-zinc-400">
                  Balance: {parseFloat(balanceIn).toFixed(4)} {TOKENS[tokenIn].symbol}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                  className="grow placeholder-zinc-500"
                  disabled={!authenticated}
                />
                <Button
                  variant="outline"
                  onClick={handleMaxClick}
                  className="bg-zinc-700 border-zinc-600 text-white hover:bg-zinc-600"
                  disabled={!authenticated}
                >
                  MAX
                </Button>
                <TokenSelector
                  selected={tokenIn}
                  onSelect={setTokenIn}
                  disabled={!authenticated}
                />
              </div>
            </div>

            {/* Switch Button */}
            <div className="flex justify-center my-2">
              <Button
                variant="outline"
                size="icon"
                onClick={switchTokens}
                className="rounded-full bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                disabled={!authenticated}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Token Out */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-sm font-medium text-zinc-400">
                  You receive
                </label>
                <span className="text-sm text-zinc-400">
                  Balance: {parseFloat(balanceOut).toFixed(4)} {TOKENS[tokenOut].symbol}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={quote?.amountOut || ''}
                  readOnly
                  className="flex-grow bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500"
                />
                <TokenSelector
                  selected={tokenOut}
                  onSelect={setTokenOut}
                  disabled={!authenticated}
                />
              </div>
            </div>

            {/* Fee Preview */}
            {quote && (
              <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Public Good Fee (3%)</span>
                  <span className="text-green-400 font-medium">
                    {parseFloat(quote.publicGoodFee).toFixed(4)} {TOKENS[tokenIn].symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Amount to Swap</span>
                  <span>{parseFloat(quote.amountAfterFee).toFixed(4)} {TOKENS[tokenIn].symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Expected Output</span>
                  <span>{parseFloat(quote.amountOut).toFixed(4)} {TOKENS[tokenOut].symbol}</span>
                </div>
              </div>
            )}

            {/* Swap Button */}
            <Button
              onClick={handleSwap}
              disabled={!authenticated || !amountIn || parseFloat(amountIn) <= 0 || isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Swapping...
                </>
              ) : !authenticated ? (
                'Connect Wallet to Swap'
              ) : (
                'Swap'
              )}
            </Button>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Success Message */}
            {txHash && (
              <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3 text-green-400 text-sm">
                <div className="flex items-center justify-between">
                  <span>Swap successful!</span>
                  <a
                    href={`https://dashboard.tenderly.co/explorer/vnet/82c86106-662e-4d7f-a974-c311987358ff/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:underline"
                  >
                    View on Tenderly
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="w-full bg-zinc-900/50">
          <CardContent className="pt-6">
            <div className="text-sm text-zinc-400 space-y-2">
              <p className="flex items-center gap-2">
                <span className="text-green-400">✨</span>
                Every swap contributes 3% to public good initiatives
              </p>
              <p className="flex items-center gap-2">
                <span className="text-blue-400">🔒</span>
                Powered by Uniswap V4 hooks on Tenderly fork
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
