import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deployment script for Octant stablecoin and Uniswap V4 mock contracts
 * Saves deployed addresses to deployments.json for use in other scripts
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy Octant stablecoin
  console.log("📝 Deploying Octant stablecoin...");
  const Octant = await ethers.getContractFactory("Octant");
  const octant = await Octant.deploy();
  await octant.waitForDeployment();
  const octantAddress = await octant.getAddress();
  console.log("✅ Octant deployed to:", octantAddress);

  // Mint initial supply to deployer
  const initialSupply = ethers.parseUnits("10000000", 18); // 10 million OCT
  await octant.mint(deployer.address, initialSupply);
  console.log(`✅ Minted ${ethers.formatUnits(initialSupply, 18)} OCT to deployer\n`);

  // Deploy Uniswap V4 Mock Contracts
  console.log("📝 Deploying Uniswap V4 mock contracts...");
  
  // Deploy PoolManager
  const PoolManager = await ethers.getContractFactory("UniswapV4PoolManager");
  const poolManager = await PoolManager.deploy();
  await poolManager.waitForDeployment();
  const poolManagerAddress = await poolManager.getAddress();
  console.log("✅ UniswapV4PoolManager deployed to:", poolManagerAddress);

  // Deploy Router
  const Router = await ethers.getContractFactory("UniswapV4Router");
  const router = await Router.deploy(poolManagerAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("✅ UniswapV4Router deployed to:", routerAddress);

  // Deploy Quoter
  const Quoter = await ethers.getContractFactory("UniswapV4Quoter");
  const quoter = await Quoter.deploy(poolManagerAddress);
  await quoter.waitForDeployment();
  const quoterAddress = await quoter.getAddress();
  console.log("✅ UniswapV4Quoter deployed to:", quoterAddress);

  // Get WETH address from mainnet (constant across forks)
  const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  console.log("📍 Using WETH at:", WETH_ADDRESS);

  // Get USDC address from mainnet
  const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  console.log("📍 Using USDC at:", USDC_ADDRESS, "\n");

  // Save deployment addresses
  const deployments = {
    octant: octantAddress,
    poolManager: poolManagerAddress,
    router: routerAddress,
    quoter: quoterAddress,
    weth: WETH_ADDRESS,
    usdc: USDC_ADDRESS,
    deployer: deployer.address,
    network: "hardhat",
    timestamp: new Date().toISOString(),
  };

  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("💾 Deployment addresses saved to deployments.json");

  // Display summary
  console.log("\n📊 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Octant:       ", octantAddress);
  console.log("PoolManager:  ", poolManagerAddress);
  console.log("Router:       ", routerAddress);
  console.log("Quoter:       ", quoterAddress);
  console.log("WETH:         ", WETH_ADDRESS);
  console.log("USDC:         ", USDC_ADDRESS);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n✨ Deployment complete! Run 'npm run seed' to create pools and add liquidity.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });