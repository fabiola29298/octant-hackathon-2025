'use client';

import { PrivyProvider as BasePrivyProvider } from "@privy-io/react-auth";

export default function PrivyProvider({ children }: { children: React.ReactNode }) {
    return(
      <BasePrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
        config={{
            embeddedWallets: {
            ethereum: {
                createOnLogin: "all-users",
            },
          }
          
        }}
      >
        {children}
      </BasePrivyProvider>
    )
}