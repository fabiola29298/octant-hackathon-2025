// components/wallet-connect-button.tsx
'use client';

import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button'; // Shadcn button

export function WalletConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  // Disable button while Privy is not ready
  if (!ready) {
    return null;
  }

  return (
    <div>
      {authenticated ? (
        <div className="flex items-center space-x-2">
          <p className="text-sm text-white">
            Connected: {user?.wallet?.address?.slice(0, 6)}...
            {user?.wallet?.address?.slice(-4)}
          </p>
          <Button onClick={logout} variant="outline" className="text-white">
            Disconnect
          </Button>
        </div>
      ) : (
        <Button onClick={login} variant="outline" className="text-white">
          Connect Wallet
        </Button>
      )}
    </div>
  );
}