// lib/contracts.ts
// Contract addresses and ABIs for Octant USD project

import OctantUSDABI from './abis/OctantUSD.json';
import UniswapV4RouterABI from './abis/UniswapV4Router.json';
import PublicGoodHookABI from './abis/PublicGoodHook.json';
import PublicGoodTreasuryABI from './abis/PublicGoodTreasury.json';
import ERC20ABI from './abis/ERC20.json';

// Contract addresses from deployments.json
export const CONTRACTS = {
  octantUSD: {
    address: '0x011b5b823663C76dc70411C2be32124372464575' as `0x${string}`,
    abi: OctantUSDABI,
  },
  router: {
    address: '0x66de75651060d9EC7218abCc7a2e4400525a1B6E' as `0x${string}`,
    abi: UniswapV4RouterABI,
  },
  treasury: {
    address: '0x242f9504864776Be37752050EdA0F4ac33a565C4' as `0x${string}`,
    abi: PublicGoodTreasuryABI,
  },
  hook: {
    address: '0x939dE020A9242b6f632BB6A47F9CE8Db897F8C38' as `0x${string}`,
    abi: PublicGoodHookABI,
  },
  weth: {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as `0x${string}`,
    abi: ERC20ABI,
  },
  usdc: {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as `0x${string}`,
    abi: ERC20ABI,
  },
} as const;

// Token metadata
export const TOKENS = {
  OUSD: {
    address: CONTRACTS.octantUSD.address,
    symbol: 'OUSD',
    name: 'Octant USD',
    decimals: 18,
    logo: '/tokens/ousd.png', // Add logo later
  },
  WETH: {
    address: CONTRACTS.weth.address,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logo: '/tokens/weth.png',
  },
  USDC: {
    address: CONTRACTS.usdc.address,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logo: '/tokens/usdc.png',
  },
} as const;

export type TokenSymbol = keyof typeof TOKENS;

// Pool fee (0.3%)
export const POOL_FEE = 3000;

// Public good fee (3%)
export const PUBLIC_GOOD_FEE_BPS = 300;
export const BPS_DENOMINATOR = 10000;
