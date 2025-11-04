// app/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WalletConnectButton } from '@/components/wallet-connect-button';
import { ArrowDown } from 'lucide-react'; // Example icon

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-300 text-white flex flex-col items-center justify-center p-4">
      <header className="w-full max-w-md flex justify-end mb-8">
        <WalletConnectButton />
      </header>

      <Card className="w-full max-w-md bg-zinc-900 border-zinc-700 text-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white">Swap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="you-pay" className="block text-sm font-medium text-zinc-400 mb-1">
              You pay
            </label>
            <div className="flex items-center space-x-2">
              <Input
                id="you-pay"
                type="number"
                placeholder="0.0"
                className="flex-grow bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500"
              />
              <Button variant="outline" className="bg-zinc-700 border-zinc-600 text-white hover:bg-zinc-600">
                MAX
              </Button>
              <Button className="bg-zinc-700 border-zinc-600 text-white hover:bg-zinc-600">
                ETH
              </Button>
            </div>
          </div>

          <div className="flex justify-center my-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <label htmlFor="you-receive" className="block text-sm font-medium text-zinc-400 mb-1">
              You receive
            </label>
            <div className="flex items-center space-x-2">
              <Input
                id="you-receive"
                type="number"
                placeholder="0.0"
                className="flex-grow bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500"
              />
              <Button className="bg-zinc-700 border-zinc-600 text-white hover:bg-zinc-600">
                DAI
              </Button>
            </div>
          </div>

          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">
            Swap
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
