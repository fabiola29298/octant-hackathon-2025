import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// WETH whale address on mainnet for impersonation
const WETH_WHALE = "0x2F0b23f53734252Bda2277357e97e1517d6B042A"; // Gemini 4
const USDC_WHALE = "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503"; // Binance

interface Deployments {
  octant: string;
  poolManager: string;
  router: string;
  quoter: string;
  weth: string;
  usdc: string;
  deployer: string;
}

/**
 * Seeds liquidity pools with initial liquidity
 * Creates OCT/WETH and OCT/USDC pools
 */
async function main() {
  console.log("🌱 Seeding liquidity pools...\n");

  // Load deployment addresses
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error("❌ deployments.json not found. Run 'npm run deploy' first.");
  }
  const deployments: Deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));

  const [deployer] = await ethers.getSigners();
  console.log("👤 Seeding with account:", deployer.address);

  // Helper function to set balance using hardhat_setBalance
  const setBalance = async (address: string, ethAmount: string) => {
    const balance = ethers.parseEther(ethAmount);
    // Convert to hex string with proper formatting (0x prefix)
    const hexBalance = "0x" + balance.toString(16);
    await ethers.provider.send("hardhat_setBalance", [address, hexBalance]);
  };

  // Fund deployer with ETH (in case running on fork)
  // Need enough for wrapping 350 ETH + gas
  await setBalance(deployer.address, "400");

  // Get contract instances
  const octant = await ethers.getContractAt("Octant", deployments.octant);
  const poolManager = await ethers.getContractAt("UniswapV4PoolManager", deployments.poolManager);
  const weth = await ethers.getContractAt("IERC20", deployments.weth);
  const usdc = await ethers.getContractAt("IERC20", deployments.usdc);

  // Get WETH directly by wrapping ETH (more reliable than using whale)
  console.log("💧 Wrapping ETH to WETH...");
  const wethAmount = ethers.parseEther("350"); // 350 WETH (need more for all pools)
  
  // Get WETH contract interface (WETH has deposit() function)
  const wethContract = await ethers.getContractAt(
    ["function deposit() payable", "function transfer(address,uint256) returns (bool)"],
    deployments.weth
  );
  
  // Wrap ETH to WETH by calling deposit() on WETH contract
  const depositTx = await wethContract.deposit({ value: wethAmount });
  await depositTx.wait();
  console.log(`✅ Wrapped ${ethers.formatEther(wethAmount)} ETH to WETH`);

  // Impersonate USDC whale to get USDC
  console.log("🐋 Impersonating USDC whale:", USDC_WHALE);
  await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
  
  // Fund whale with ETH for gas
  await setBalance(USDC_WHALE, "10");
  
  const usdcWhale = await ethers.getSigner(USDC_WHALE);

  // Check whale's USDC balance first
  const usdcAmount = ethers.parseUnits("1000000", 6); // 1M USDC (6 decimals)
  const usdcWhaleBalance = await usdc.balanceOf(USDC_WHALE);
  
  if (usdcWhaleBalance >= usdcAmount) {
    // Whale has enough, transfer it
    await usdc.connect(usdcWhale).transfer(deployer.address, usdcAmount);
    console.log(`✅ Received ${ethers.formatUnits(usdcAmount, 6)} USDC from whale\n`);
  } else {
    // Whale doesn't have enough - use storage manipulation to set balance
    console.log(`⚠️  Whale has ${ethers.formatUnits(usdcWhaleBalance, 6)} USDC, using storage manipulation...`);
    
    // Calculate storage slot for deployer's balance in USDC contract
    // ERC20 balance slot: keccak256(abi.encode(deployer, balanceMappingSlot))
    // USDC uses slot 9 for balances mapping
    const balanceSlot = 9; // Common slot for USDC balances
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encoded = abiCoder.encode(
      ["address", "uint256"],
      [deployer.address, balanceSlot]
    );
    const slot = ethers.keccak256(encoded);
    
    // Set the balance to 1M USDC (pad to 32 bytes)
    const paddedValue = ethers.zeroPadValue(ethers.toBeHex(usdcAmount), 32);
    await ethers.provider.send("hardhat_setStorageAt", [
      deployments.usdc,
      slot,
      paddedValue,
    ]);
    
    // Verify the balance was set
    const newBalance = await usdc.balanceOf(deployer.address);
    console.log(`✅ Set USDC balance to ${ethers.formatUnits(newBalance, 6)} USDC\n`);
  }

  // Create and seed OCT/WETH pool
  console.log("📊 Creating OCT/WETH pool...");
  const fee = 3000; // 0.3% fee tier
  
  // Sort tokens (required by Uniswap)
  const [token0_weth, token1_weth] = deployments.octant < deployments.weth 
    ? [deployments.octant, deployments.weth]
    : [deployments.weth, deployments.octant];
  
  // Check if pool already exists
  try {
    await poolManager.createPool(token0_weth, token1_weth, fee);
    console.log("✅ OCT/WETH pool created");
  } catch (error: any) {
    if (error.message && error.message.includes("Pool already exists")) {
      console.log("⚠️  OCT/WETH pool already exists, skipping creation");
    } else {
      throw error;
    }
  }

  // Add liquidity to OCT/WETH pool
  const poolManagerAddress = await poolManager.getAddress();
  
  // Check if pool already has liquidity by trying to get a quote
  let needsLiquidity = true;
  try {
    await poolManager.getAmountOut(deployments.octant, deployments.weth, fee, ethers.parseUnits("1", 18));
    // If quote succeeds, pool has liquidity
    const poolReserves = await poolManager.pools(
      ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "address", "uint24"],
          [token0_weth, token1_weth, fee]
        )
      )
    );
    if (poolReserves.reserve0 > BigInt(0) && poolReserves.reserve1 > BigInt(0)) {
      needsLiquidity = false;
      console.log("⚠️  OCT/WETH pool already has liquidity, skipping");
    }
  } catch {
    // Pool doesn't exist or has no liquidity, proceed with adding
    needsLiquidity = true;
  }

  if (needsLiquidity) {
    const octAmount = ethers.parseUnits("1000000", 18); // 1M OCT
    const wethLiqAmount = ethers.parseEther("50"); // 50 WETH

    // Check available balance
    const octBalance = await octant.balanceOf(deployer.address);
    const wethBalance = await weth.balanceOf(deployer.address);
    
    if (octBalance < octAmount) {
      console.log(`⚠️  Insufficient OCT balance. Have: ${ethers.formatUnits(octBalance, 18)}, Need: ${ethers.formatUnits(octAmount, 18)}`);
      console.log(`    Using available balance: ${ethers.formatUnits(octBalance, 18)} OCT`);
      // Use available balance proportionally
      const wethAmountAdjusted = (wethLiqAmount * octBalance) / octAmount;
      await octant.approve(poolManagerAddress, octBalance);
      await weth.approve(poolManagerAddress, wethAmountAdjusted);
      
      const [amount0_weth, amount1_weth] = deployments.octant < deployments.weth
        ? [octBalance, wethAmountAdjusted]
        : [wethAmountAdjusted, octBalance];
      
      await poolManager.addLiquidity(token0_weth, token1_weth, fee, amount0_weth, amount1_weth);
      console.log(`✅ Added liquidity: ${ethers.formatUnits(octBalance, 18)} OCT + ${ethers.formatEther(wethAmountAdjusted)} WETH\n`);
    } else {
      await octant.approve(poolManagerAddress, octAmount);
      await weth.approve(poolManagerAddress, wethLiqAmount);

      const [amount0_weth, amount1_weth] = deployments.octant < deployments.weth
        ? [octAmount, wethLiqAmount]
        : [wethLiqAmount, octAmount];

      await poolManager.addLiquidity(token0_weth, token1_weth, fee, amount0_weth, amount1_weth);
      console.log(`✅ Added liquidity: ${ethers.formatUnits(octAmount, 18)} OCT + ${ethers.formatEther(wethLiqAmount)} WETH\n`);
    }
  }

  // Create and seed OCT/USDC pool
  console.log("📊 Creating OCT/USDC pool...");
  
  const [token0_usdc, token1_usdc] = deployments.octant < deployments.usdc
    ? [deployments.octant, deployments.usdc]
    : [deployments.usdc, deployments.octant];
  
  // Check if pool already exists
  try {
    await poolManager.createPool(token0_usdc, token1_usdc, fee);
    console.log("✅ OCT/USDC pool created");
  } catch (error: any) {
    if (error.message && error.message.includes("Pool already exists")) {
      console.log("⚠️  OCT/USDC pool already exists, skipping creation");
    } else {
      throw error;
    }
  }

  // Add liquidity to OCT/USDC pool
  // Check if pool already has liquidity
  let needsLiquidity2 = true;
  try {
    await poolManager.getAmountOut(deployments.octant, deployments.usdc, fee, ethers.parseUnits("1", 18));
    const poolReserves2 = await poolManager.pools(
      ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "address", "uint24"],
          [token0_usdc, token1_usdc, fee]
        )
      )
    );
    if (poolReserves2.reserve0 > BigInt(0) && poolReserves2.reserve1 > BigInt(0)) {
      needsLiquidity2 = false;
      console.log("⚠️  OCT/USDC pool already has liquidity, skipping");
    }
  } catch {
    needsLiquidity2 = true;
  }

  if (needsLiquidity2) {
    const octAmount2 = ethers.parseUnits("1000000", 18); // 1M OCT
    const usdcLiqAmount = ethers.parseUnits("1000000", 6); // 1M USDC (simulating 1:1 peg)

    // Check available balance
    const octBalance = await octant.balanceOf(deployer.address);
    const usdcBalance = await usdc.balanceOf(deployer.address);
    
    if (octBalance < octAmount2) {
      console.log(`⚠️  Insufficient OCT balance. Have: ${ethers.formatUnits(octBalance, 18)}, Need: ${ethers.formatUnits(octAmount2, 18)}`);
      console.log(`    Using available balance: ${ethers.formatUnits(octBalance, 18)} OCT`);
      // Use available balance proportionally
      const usdcAmountAdjusted = (usdcLiqAmount * octBalance) / octAmount2;
      await octant.approve(poolManagerAddress, octBalance);
      await usdc.approve(poolManagerAddress, usdcAmountAdjusted);
      
      const [amount0_usdc, amount1_usdc] = deployments.octant < deployments.usdc
        ? [octBalance, usdcAmountAdjusted]
        : [usdcAmountAdjusted, octBalance];
      
      await poolManager.addLiquidity(token0_usdc, token1_usdc, fee, amount0_usdc, amount1_usdc);
      console.log(`✅ Added liquidity: ${ethers.formatUnits(octBalance, 18)} OCT + ${ethers.formatUnits(usdcAmountAdjusted, 6)} USDC\n`);
    } else {
      await octant.approve(poolManagerAddress, octAmount2);
      await usdc.approve(poolManagerAddress, usdcLiqAmount);

      const [amount0_usdc, amount1_usdc] = deployments.octant < deployments.usdc
        ? [octAmount2, usdcLiqAmount]
        : [usdcLiqAmount, octAmount2];

      await poolManager.addLiquidity(token0_usdc, token1_usdc, fee, amount0_usdc, amount1_usdc);
      console.log(`✅ Added liquidity: ${ethers.formatUnits(octAmount2, 18)} OCT + ${ethers.formatUnits(usdcLiqAmount, 6)} USDC\n`);
    }
  }

  // Create and seed USDC/WETH pool (needed for multi-hop swaps)
  console.log("📊 Creating USDC/WETH pool...");
  
  const [token0_usdc_weth, token1_usdc_weth] = deployments.usdc < deployments.weth
    ? [deployments.usdc, deployments.weth]
    : [deployments.weth, deployments.usdc];
  
  // Check if pool already exists
  try {
    await poolManager.createPool(token0_usdc_weth, token1_usdc_weth, fee);
    console.log("✅ USDC/WETH pool created");
  } catch (error: any) {
    if (error.message && error.message.includes("Pool already exists")) {
      console.log("⚠️  USDC/WETH pool already exists, skipping creation");
    } else {
      throw error;
    }
  }

  // Add liquidity to USDC/WETH pool
  // For a reasonable exchange rate: 1 USDC ≈ 0.0005 WETH (approx $2000 ETH price)
  // Using available balances: we have ~50 WETH left and plenty of USDC
  const usdcLiqAmount2 = ethers.parseUnits("100000", 6); // 100K USDC
  const wethLiqAmount2 = ethers.parseEther("50"); // 50 WETH (1:2000 ratio)

  await usdc.approve(poolManagerAddress, usdcLiqAmount2);
  await weth.approve(poolManagerAddress, wethLiqAmount2);

  const [amount0_usdc_weth, amount1_usdc_weth] = deployments.usdc < deployments.weth
    ? [usdcLiqAmount2, wethLiqAmount2]
    : [wethLiqAmount2, usdcLiqAmount2];

  await poolManager.addLiquidity(token0_usdc_weth, token1_usdc_weth, fee, amount0_usdc_weth, amount1_usdc_weth);
  console.log(`✅ Added liquidity: ${ethers.formatUnits(usdcLiqAmount2, 6)} USDC + ${ethers.formatEther(wethLiqAmount2)} WETH\n`);

  // Display final balances
  console.log("📊 Final Balances:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("OCT:  ", ethers.formatUnits(await octant.balanceOf(deployer.address), 18));
  console.log("WETH: ", ethers.formatEther(await weth.balanceOf(deployer.address)));
  console.log("USDC: ", ethers.formatUnits(await usdc.balanceOf(deployer.address), 6));
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n✨ Pools seeded successfully! Run 'npm run swap' to test swaps.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Pool seeding failed:", error);
    process.exit(1);
  });