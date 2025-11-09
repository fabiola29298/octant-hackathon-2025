import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const MAINNET_FORK_URL =
  process.env.MAINNET_RPC_URL ||
  "https://virtual.mainnet.eu.rpc.tenderly.co/82c86106-662e-4d7f-a974-c311987358ff";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: MAINNET_FORK_URL,
        blockNumber: undefined, // Latest block; set a specific number for reproducibility
      },
      chainId: 1,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    tenderly: {
      url: MAINNET_FORK_URL,
      chainId: 8,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;