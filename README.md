# Octaswap: Every Swap Makes an Impact

The DeFi landscape is revolutionary, with billions transacted daily. But wnpm hat if our transactions could build more than just wealth? What if they could build a better world?

Octaswap is a decentralized exchange, where along with helping in seamlessly swapping tokens, we are also aiming to change life. 

## Here's how we are doing it 

1. A Stable Store of Value for Octant : oUSD

> Pegged 1:1 with US Dollar to provide a reliable and stable asset in an otherwise volatile market, ensuring our users have a secure base for their transactions.

2. Seamless Swapping

> Our users can easily exchange oUSD for ETH, BTC, and any other supported token within the ecosystem, and vice versa, and we are enabling this by using the Uniswap v4 hook for dynamic fee concept

3. A Public Goods Engine

>This is where Octaswap truly shines. A 3% fee on every swap is dedicated entirely to public goods. 

## Tracks Applied
- Best tutorial for Octant v2 [link](https://www.notion.so/Octant-V2-Complete-Technical-Guide-Integration-Tutorial-2a63ed3fab0580b3ac6ae2cdd0c62a6f)
- Best public good projects
- Best team for dev3pack
- Best use of uniswap v4 Hooks

## Project Structure
Our project is organized into the following key components:

### Frontend
`frontend/frontend-app`: This directory contains the user interface for Octaswap, built to provide a seamless and intuitive swapping experience.
### Smart Contracts	
`contracts/OctantUSD.sol`: This ERC20 stablecoin contract defines our fully collateralized 'oUSD' token, pegged 1:1. 
Deployed: 0x9a957CBf2938A8f18cC622dCa7452003A3e8f154
`contracts/PublicGoodHook.sol`: This contract is responsible for implementing the 3% fee on every swap, directing these funds to the Public Good Treasury. This hook is called before swaps to deduct the fee and send it to the treasury.
Deployed: 0x76d4788baa7e24FeD253B3Ce1992700F4072bC23
`contracts/PublicGoodTreasury.sol`: This contract securely manages fees from swaps.  
Deployed: 0x98755Fc7D3dEEeF114e2585C9a7dc609240C2E5d
`contracts/UniswapV4Mocks.sol`: These contracts are mock implementations of Uniswap V4 components, used for testing and development purposes.
UniswapV4Router: 0x296852b1AC730b84EA217A7A0a320559826BA492
UniswapV4Quoter: 0x1F1cEC96DfDA5094e545f3aa8AD0241baE36e1a7
0x1F1cEC96DfDA5094e545f3aa8AD0241baE36e1a7
WETH: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 (mainnet)
USDC: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 (mainnet)
Deployer: 0xb18109b3b6B8Ba5188cbDdBd2bb6046fa69F605C
Network: Tenderly

### Images

![Landing page](/images/landing1.png)


![Landing page and swap card](/images/landing2.png)

### ▶️ Local Development [frontend]

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

