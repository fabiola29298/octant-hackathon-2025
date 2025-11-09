// app/page.tsx
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WalletConnectButton } from '@/components/wallet-connect-button';
import { ArrowRight, Coins, TrendingUp, Heart } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">OctantUSD</h1>
            <p className="text-zinc-400 mt-1">DeFi that works for public good 🌍</p>
          </div>
          <WalletConnectButton />
        </header>

        {/* Hero Section */}
        <div className="text-center py-12">
          <h2 className="text-5xl font-bold mb-4">
            Swap with Purpose
          </h2>
          <p className="text-xl text-zinc-400 mb-8">
            Every swap contributes 3% to public good initiatives
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/swap">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                Start Swapping
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/treasury">
              <Button size="lg" variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800">
                View Treasury
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-zinc-900/50">
            <CardHeader>
              <Coins className="h-10 w-10 text-blue-400 mb-2" />
              <CardTitle>Seamless Swaps</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400">
                Trade OUSD, WETH, and USDC with low fees powered by Uniswap V4
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50">
            <CardHeader>
              <Heart className="h-10 w-10 text-green-400 mb-2" />
              <CardTitle>3% Public Good Fee</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400">
                Automatic contribution to public good initiatives with every trade
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50">
            <CardHeader>
              <TrendingUp className="h-10 w-10 text-purple-400 mb-2" />
              <CardTitle>Transparent Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400">
                Track all contributions in real-time on the treasury dashboard
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/50">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold mb-2">Ready to make an impact?</h3>
                <p className="text-zinc-300">
                  Start swapping and contribute to public good with every transaction
                </p>
              </div>
              <Link href="/swap">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold whitespace-nowrap">
                  Launch App
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center text-zinc-500 text-sm py-8">
          <p>Built for Octant Hackathon • Powered by Uniswap V4 & Tenderly</p>
        </footer>
      </div>
    </div>
  );
}
