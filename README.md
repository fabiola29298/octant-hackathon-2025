# Octant Hackathon



### 💡 Frontend / Description  

.env info

*   **`NEXT_PUBLIC_RPC_URL`**: This is the HTTPS RPC URL provided by Tenderly for your Mainnet Fork. Ensure it points to your specific fork instance.
*   **`NEXT_PUBLIC_PRIVY_APP_ID`**: Obtain this from your Privy dashboard after creating an application. It's used for client-side authentication.
*   **`PRIVY_APP_SECRET`**: Also from your Privy dashboard. This should be kept secure and is typically used for server-side operations if you have them, but is often required by Privy's SDK even for frontend only setups.

### ▶️ Local Development

To run the project locally, use the following commands:

1.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
2.  **Start the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The application will typically be accessible at `http://localhost:3000`.

### 🦊 Connecting to the Tenderly Fork with MetaMask

You'll need to manually add this network to your MetaMask wallet.

1.  **Open MetaMask:** Click on your MetaMask browser extension.
2.  **Switch Networks:** Click the network selector dropdown (usually says "Ethereum Mainnet" or "Sepolia Test Network").
3.  **Select "Add network"**: Scroll down and click this option.
4.  **Select "Add a network manually"**:
5.  **Enter the network details:**
    *   **Network Name:** `Octant Hackathon Mainnet Fork` (or a descriptive name)
    *   **New RPC URL:** `https://virtual.mainnet.eu.rpc.tenderly.co/82c86106-662e-4d7f-a974-c311987358ff` (use the HTTPS RPC URL from your Tenderly fork)
    *   **Chain ID:** `8` (the Chain ID provided by Tenderly for your fork)
    *   **Currency Symbol:** `ETH`
    *   **Block Explorer URL (Optional):** You can leave this blank or add one if Tenderly provides a specific explorer URL for your fork.
6.  **Click "Save".**

