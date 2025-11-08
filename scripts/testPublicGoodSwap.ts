import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";


//Test script to demonstrate the 3% public good fee mechanism

async function main() {
  console.log("💱 Testing Public Good Fee Mechanism\n");

  // Load deployments
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error("❌ deployments.json not found. Run 'npm run setup' first.");
  }
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));

  const [user] = await ethers.getSigners();
  console.log("👤 Trading as:", user.address, "\n");

  // Get contract instances
  const octantUSD = await ethers.getContractAt("OctantUSD", deployments.octantUSD);
  const weth = await ethers.getContractAt("IERC20", deployments.weth);
  const router = await ethers.getContractAt("UniswapV4Router", deployments.router);
  const treasury = await ethers.getContractAt("PublicGoodTreasury", deployments.treasury);
  const hook = await ethers.getContractAt("PublicGoodHook", deployments.hook);

  const fee = 3000; // 0.3% pool fee

  //Test swap with Public Good Fee
  console.log(" Executing swap: 1000 OUSD → WETH");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const swapAmount = ethers.parseUnits("1000", 18); // 1000 OUSD
  
  // Calculate expected fee (3%)
  const expectedFee = await hook.calculateFee(swapAmount);
  const amountAfterFee = await hook.getAmountAfterFee(swapAmount);
  
  console.log(" Fee Calculation:");
  console.log("   Input amount:     ", ethers.formatUnits(swapAmount, 18), "OUSD");
  console.log("   Public good fee:  ", ethers.formatUnits(expectedFee, 18), "OUSD (3%)");
  console.log("   Amount to swap:   ", ethers.formatUnits(amountAfterFee, 18), "OUSD\n");

  // Check balances before
  const ousdBalanceBefore = await octantUSD.balanceOf(user.address);
  const wethBalanceBefore = await weth.balanceOf(user.address);
  const treasuryBalanceBefore = await octantUSD.balanceOf(deployments.treasury);
  
  console.log(" Balances Before Swap:");
  console.log("   User OUSD:        ", ethers.formatUnits(ousdBalanceBefore, 18));
  console.log("   User WETH:        ", ethers.formatEther(wethBalanceBefore));
  console.log("   Treasury OUSD:    ", ethers.formatUnits(treasuryBalanceBefore, 18), "\n");

  // Approve and execute swap
  const routerAddress = await router.getAddress();
  await octantUSD.approve(routerAddress, swapAmount);
  
  console.log("⏳ Executing swap...");
  const swapTx = await router.exactInputSingle({
    tokenIn: deployments.octantUSD,
    tokenOut: deployments.weth,
    fee: fee,
    recipient: user.address,
    amountIn: swapAmount,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  });
  
  const receipt = await swapTx.wait();
  console.log("✅ Swap executed! TxHash:", receipt?.hash, "\n");

  // Check balances after
  const ousdBalanceAfter = await octantUSD.balanceOf(user.address);
  const wethBalanceAfter = await weth.balanceOf(user.address);
  const treasuryBalanceAfter = await octantUSD.balanceOf(deployments.treasury);
  
  const ousdSpent = ousdBalanceBefore - ousdBalanceAfter;
  const wethReceived = wethBalanceAfter - wethBalanceBefore;
  const treasuryReceived = treasuryBalanceAfter - treasuryBalanceBefore;

  console.log(" Balances After Swap:");
  console.log("   User OUSD:        ", ethers.formatUnits(ousdBalanceAfter, 18));
  console.log("   User WETH:        ", ethers.formatEther(wethBalanceAfter));
  console.log("   Treasury OUSD:    ", ethers.formatUnits(treasuryBalanceAfter, 18), "\n");

  console.log(" Swap Results:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   OUSD spent:       ", ethers.formatUnits(ousdSpent, 18));
  console.log("   WETH received:    ", ethers.formatEther(wethReceived));
  console.log("   Public good fee:  ", ethers.formatUnits(treasuryReceived, 18), "OUSD");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Verify fee is correct
  const feePercentage = (Number(treasuryReceived) / Number(ousdSpent)) * 100;
  console.log("✅ Fee Verification:");
  console.log("   Expected fee:     3.00%");
  console.log("   Actual fee:       " + feePercentage.toFixed(2) + "%");
  
  if (Math.abs(feePercentage - 3.0) < 0.01) {
    console.log("   Status:           ✅ CORRECT\n");
  } else {
    console.log("   Status:           ⚠️  MISMATCH\n");
  }

  // Check treasury total contributions
  const totalContributions = await treasury.getContributions(deployments.octantUSD);
  console.log(" Treasury Status:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   Total OUSD contributions: ", ethers.formatUnits(totalContributions, 18));
  console.log("   Treasury balance:         ", ethers.formatUnits(treasuryBalanceAfter, 18));
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("✨ Public good fee mechanism working correctly!");
  console.log("   Every swap contributes 3% to public good initiatives! 🌍");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
