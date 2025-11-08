// app/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WalletConnectButton } from '@/components/wallet-connect-button';
import { ArrowDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
 
export default function HomePage() {
   
  const userBalanceETH = "1.234";
  const userBalanceUSDT = "500.00";
  const currentNetwork = "Ethereum Mainnet";  
  const swapFee = "0.25%"; 
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h2 className="text-3xl font-semibold mb-6 text-white">Stablecoin for Octant</h2>

      <header className="w-full max-w-md flex justify-between items-center mb-8">
      
        <div className="text-sm text-zinc-400">
          Network: <span className="font-medium text-white">{currentNetwork}</span>
        </div>
        <WalletConnectButton />
      </header>

      <Card className="w-full max-w-md bg-zinc-900 border-zinc-700 text-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white">
            Swap
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/*  Pay Section */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="you-pay" className="block text-sm font-medium text-zinc-400">
                You pay
              </label> 
              <span className="text-xs text-zinc-500">
                Balance: {userBalanceETH} ETH  
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                id="you-pay"
                type="number"
                placeholder="0.0"
                className="grow bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500"
              />
               
              <Button variant="ghost" size="sm" className="bg-zinc-700 hover:bg-zinc-600 text-white">
                MAX
              </Button>
              <Select defaultValue="eth">  
                <SelectTrigger className="w-[120px] bg-zinc-700 border-zinc-600 text-white hover:bg-zinc-600 [&>span]:text-white">
                  <SelectValue placeholder="Select Token" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectItem value="eth">WETH</SelectItem>
                  <SelectItem value="usdt">USDT</SelectItem>
                  <SelectItem value="ousdc">OUSDC</SelectItem>
                </SelectContent>
              </Select>
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

          {/* You Receive Section */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="you-receive" className="block text-sm font-medium text-zinc-400">
                You receive
              </label>
               
              <span className="text-xs text-zinc-500">
                Balance: {userBalanceUSDT} USDT  
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                id="you-receive"
                type="number"
                placeholder="0.0"
                className="grow bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500"
                readOnly 
              />
               
              <Select defaultValue="usdt">  
                <SelectTrigger className="w-[120px] bg-zinc-700 border-zinc-600 text-white hover:bg-zinc-600 [&>span]:text-white">
                  <SelectValue placeholder="Select Token" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectItem value="eth">ETH</SelectItem>
                  <SelectItem value="usdt">USDT</SelectItem>
                  <SelectItem value="ousdc">OUSDC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

           
          <div className="text-right text-sm text-zinc-400 mt-2">
            Fee: <span className="font-medium text-white">{swapFee}</span>
          </div>

          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">
            Swap
          </Button>

           
        </CardContent>
      </Card>
    </div>
  );
}