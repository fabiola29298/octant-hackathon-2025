import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

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
 * Encodes a swap path for multi-hop swaps
 * Format: token0 (20 bytes) + fee0 (3 bytes) + token1 (20 bytes) + fee1 (3 bytes) + ...
 */
function encodePath(tokens: string[], fees: number[]): string {
  if (tokens.length !== fees.length + 1) {
    throw new Error("Invalid path: tokens.length must equal fees.length + 1");
  }

  let encodedPath = "0x";
  for (let i = 0; i < fees.length; i++) {
    encodedPath += tokens[i].slice(2); // Remove '0x'
    encodedPath += fees[i].toString(16).padStart(6, "0"); // 3 bytes = 6 hex chars
  }
  encodedPath += tokens[tokens.length - 1].slice(2);

  return encodedPath;
}

/**
 * Calculates minimum output amount with slippage tolerance
 */
function calculateMinOutput(estimatedOutput: bigint, slippageBps: number): bigint {
  return (estimatedOutput * BigInt(10000 - slippageBps)) / BigInt(10000);
}

/**
 * Main script demonstrating quotes and swaps
 */
async function main() {
  console.log("💱 Quote and Swap Demo\n");

  // Load deployments
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error("❌ deployments.json not found. Run 'npm run deploy' first.");
  }
  const deployments: Deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));

  const [user] = await ethers.getSigners();
  console.log("👤 Trading as:", user.address, "\n");

  // Get contract instances
  const octant = await ethers.getContractAt("Octant", deployments.octant);
  const weth = await ethers.getContractAt("IERC20", deployments.weth);
  const usdc = await ethers.getContractAt("IERC20", deployments.usdc);
  const router = await ethers.getContractAt("UniswapV4Router", deployments.router);
  const quoter = await ethers.getContractAt("UniswapV4Quoter", deployments.quoter);
  const poolManager = await ethers.getContractAt("UniswapV4PoolManager", deployments.poolManager);

  const fee = 3000; // 0.3%
  const slippageBps = 50; // 0.5% slippage tolerance

  // Verify pools are initialized and have liquidity before attempting swaps
  console.log("🔍 Checking pool initialization and liquidity...");
  try {
    // Sort tokens for pool lookup
    const [token0_weth, token1_weth] = deployments.octant < deployments.weth 
      ? [deployments.octant, deployments.weth]
      : [deployments.weth, deployments.octant];
    
    const [token0_usdc, token1_usdc] = deployments.octant < deployments.usdc
      ? [deployments.octant, deployments.usdc]
      : [deployments.usdc, deployments.octant];

    // Check if pools exist and have liquidity by trying to get quotes
    // This will fail if pools don't exist or have no liquidity
    const testAmount = ethers.parseUnits("1", 18); // 1 OCT
    
    // Check OCT/WETH pool
    try {
      await poolManager.getAmountOut(deployments.octant, deployments.weth, fee, testAmount);
    } catch (error: any) {
      if (error.message && error.message.includes("not initialized")) {
        throw new Error("OCT/WETH pool is not initialized");
      }
      throw new Error("OCT/WETH pool has no liquidity or is not initialized");
    }
    
    // Check OCT/USDC pool
    try {
      await poolManager.getAmountOut(deployments.octant, deployments.usdc, fee, testAmount);
    } catch (error: any) {
      if (error.message && error.message.includes("not initialized")) {
        throw new Error("OCT/USDC pool is not initialized");
      }
      throw new Error("OCT/USDC pool has no liquidity or is not initialized");
    }
    
    // Check USDC/WETH pool (needed for multi-hop swaps)
    try {
      await poolManager.getAmountOut(deployments.usdc, deployments.weth, fee, ethers.parseUnits("1", 6));
    } catch (error: any) {
      if (error.message && error.message.includes("not initialized")) {
        throw new Error("USDC/WETH pool is not initialized (needed for multi-hop swaps)");
      }
      throw new Error("USDC/WETH pool has no liquidity or is not initialized (needed for multi-hop swaps)");
    }
    
    console.log("✅ Pools are initialized and have liquidity\n");
  } catch (error: any) {
    if (error.message && (error.message.includes("not initialized") || error.message.includes("no liquidity"))) {
      throw new Error(
        "❌ Pools are not initialized or have no liquidity. Please run 'npm run seed' first to create and seed the liquidity pools."
      );
    } else {
      throw new Error(
        `❌ Pools are not initialized. Please run 'npm run seed' first to create and seed the liquidity pools. Error: ${error.message}`
      );
    }
  }

  // ============================================================
  // Example 1: Single-hop swap OCT → WETH
  // ============================================================
  console.log("🔄 Example 1: Single-hop swap OCT → WETH");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const octIn = ethers.parseUnits("1000", 18); // 1000 OCT
  
  // Get quote
  const wethQuote = await quoter.quoteExactInputSingle(
    deployments.octant,
    deployments.weth,
    fee,
    octIn,
    0 // sqrtPriceLimitX96 (unused in mock)
  );
  
  console.log(`📊 Quote: ${ethers.formatUnits(octIn, 18)} OCT → ${ethers.formatEther(wethQuote)} WETH (estimated)`);

  // Check balances before
  const octBalanceBefore = await octant.balanceOf(user.address);
  const wethBalanceBefore = await weth.balanceOf(user.address);
  console.log(`💼 Balances before: OCT=${ethers.formatUnits(octBalanceBefore, 18)}, WETH=${ethers.formatEther(wethBalanceBefore)}`);

  // Approve and execute swap
  const routerAddress = await router.getAddress();
  await octant.approve(routerAddress, octIn);
  
  const minWethOut = calculateMinOutput(wethQuote, slippageBps);
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

  console.log(`🎯 Minimum output (0.5% slippage): ${ethers.formatEther(minWethOut)} WETH`);
  
  const swapTx = await router.exactInputSingle({
    tokenIn: deployments.octant,
    tokenOut: deployments.weth,
    fee: fee,
    recipient: user.address,
    amountIn: octIn,
    amountOutMinimum: minWethOut,
    sqrtPriceLimitX96: 0,
  });
  
  const receipt = await swapTx.wait();
  console.log(`✅ Swap executed: txHash=${receipt?.hash}`);

  // Check balances after
  const octBalanceAfter = await octant.balanceOf(user.address);
  const wethBalanceAfter = await weth.balanceOf(user.address);
  const wethReceived = wethBalanceAfter - wethBalanceBefore;
  
  console.log(`💼 Balances after:  OCT=${ethers.formatUnits(octBalanceAfter, 18)}, WETH=${ethers.formatEther(wethBalanceAfter)}`);
  console.log(`✨ Received: ${ethers.formatEther(wethReceived)} WETH`);
  
  // Calculate slippage (all values are bigint)
  const slippageDiff = BigInt(wethQuote) - BigInt(wethReceived);
  const actualSlippage = (slippageDiff * BigInt(10000)) / BigInt(wethQuote);
  const slippagePercent = Number(actualSlippage) / 100;
  console.log(`📉 Actual slippage: ${slippagePercent}%\n`);

  // Estimate gas
  const gasUsed = receipt?.gasUsed || BigInt(0);
  const gasPrice = receipt?.gasPrice || BigInt(0);
  const gasCost = gasUsed * gasPrice;
  console.log(`⛽ Gas used: ${gasUsed.toString()} (${ethers.formatEther(gasCost)} ETH)\n`);

  // ============================================================
  // Example 2: Multi-hop swap OCT → USDC → WETH
  // ============================================================
  console.log("🔄 Example 2: Multi-hop swap OCT → USDC → WETH");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const octIn2 = ethers.parseUnits("500", 18); // 500 OCT
  
  // Encode path: OCT → USDC → WETH
  const swapPath = encodePath(
    [deployments.octant, deployments.usdc, deployments.weth],
    [fee, fee]
  );

  // Get multi-hop quote
  const wethQuote2 = await quoter.quoteExactInput(swapPath, octIn2);
  console.log(`📊 Quote: ${ethers.formatUnits(octIn2, 18)} OCT → ${ethers.formatEther(wethQuote2)} WETH (via USDC)`);

  // Check balances before
  const octBalanceBefore2 = await octant.balanceOf(user.address);
  const wethBalanceBefore2 = await weth.balanceOf(user.address);
  console.log(`💼 Balances before: OCT=${ethers.formatUnits(octBalanceBefore2, 18)}, WETH=${ethers.formatEther(wethBalanceBefore2)}`);

  // Approve and execute multi-hop swap
  await octant.approve(routerAddress, octIn2);
  
  const minWethOut2 = calculateMinOutput(wethQuote2, slippageBps);
  console.log(`🎯 Minimum output (0.5% slippage): ${ethers.formatEther(minWethOut2)} WETH`);

  const swapTx2 = await router.exactInput({
    path: swapPath,
    recipient: user.address,
    amountIn: octIn2,
    amountOutMinimum: minWethOut2,
  });

  const receipt2 = await swapTx2.wait();
  console.log(`✅ Multi-hop swap executed: txHash=${receipt2?.hash}`);

  // Check balances after
  const octBalanceAfter2 = await octant.balanceOf(user.address);
  const wethBalanceAfter2 = await weth.balanceOf(user.address);
  const wethReceived2 = wethBalanceAfter2 - wethBalanceBefore2;
  
  console.log(`💼 Balances after:  OCT=${ethers.formatUnits(octBalanceAfter2, 18)}, WETH=${ethers.formatEther(wethBalanceAfter2)}`);
  console.log(`✨ Received: ${ethers.formatEther(wethReceived2)} WETH`);
  
  // Calculate slippage (all values are bigint)
  const slippageDiff2 = BigInt(wethQuote2) - BigInt(wethReceived2);
  const actualSlippage2 = (slippageDiff2 * BigInt(10000)) / BigInt(wethQuote2);
  const slippagePercent2 = Number(actualSlippage2) / 100;
  console.log(`📉 Actual slippage: ${slippagePercent2}%\n`);

  // Estimate gas
  const gasUsed2 = receipt2?.gasUsed || BigInt(0);
  const gasPrice2 = receipt2?.gasPrice || BigInt(0);
  const gasCost2 = gasUsed2 * gasPrice2;
  console.log(`⛽ Gas used: ${gasUsed2.toString()} (${ethers.formatEther(gasCost2)} ETH)\n`);

  // ============================================================
  // Summary
  // ============================================================
  console.log("📊 Trading Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Final OCT:  ", ethers.formatUnits(await octant.balanceOf(user.address), 18));
  console.log("Final WETH: ", ethers.formatEther(await weth.balanceOf(user.address)));
  console.log("Final USDC: ", ethers.formatUnits(await usdc.balanceOf(user.address), 6));
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n✨ All swaps completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Swap failed:", error);
    process.exit(1);
  });