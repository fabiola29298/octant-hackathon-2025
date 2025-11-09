// app/treasury/page.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WalletConnectButton } from '@/components/wallet-connect-button';
import { useTreasury } from '@/hooks/useTreasury';
import { Loader2 } from 'lucide-react';

export default function TreasuryPage() {
  const { totalOUSDCollected, treasuryBalance, isLoading, error } = useTreasury();

  return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-semibold">Public Good Treasury</h2>
            <p className="text-zinc-400 mt-1">
              Every swap contributes 3% to public good initiatives 🌍
            </p>
          </div>
          <WalletConnectButton />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Collected */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-zinc-400">Total Fees Collected</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : error ? (
                <span className="text-red-400">{error}</span>
              ) : (
                <div>
                  <div className="text-4xl font-bold text-green-400">
                    {parseFloat(totalOUSDCollected).toFixed(2)} OUSD
                  </div>
                  <p className="text-sm text-zinc-500 mt-1">
                    From all swaps since deployment
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Balance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-zinc-400">Current Treasury Balance</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : error ? (
                <span className="text-red-400">{error}</span>
              ) : (
                <div>
                  <div className="text-4xl font-bold text-blue-400">
                    {parseFloat(treasuryBalance).toFixed(2)} OUSD
                  </div>
                  <p className="text-sm text-zinc-500 mt-1">
                    Available for public good projects
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="bg-zinc-900/50">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-zinc-300">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💱</span>
              <div>
                <h4 className="font-semibold">Automatic Fee Collection</h4>
                <p className="text-sm text-zinc-400">
                  Every swap through our platform automatically deducts 3% as a public good fee
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🏦</span>
              <div>
                <h4 className="font-semibold">Treasury Management</h4>
                <p className="text-sm text-zinc-400">
                  Fees are stored in a secure smart contract treasury
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🌍</span>
              <div>
                <h4 className="font-semibold">Public Good Impact</h4>
                <p className="text-sm text-zinc-400">
                  Funds are allocated to support public good initiatives and community projects
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract Info */}
        <Card className="bg-zinc-900/30">
          <CardContent className="pt-6">
            <div className="text-xs text-zinc-500 space-y-1">
              <p>Treasury Contract: 0x242f...58C4</p>
              <p>Hook Contract: 0x939d...8C38</p>
              <p>Network: Tenderly Mainnet Fork</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
