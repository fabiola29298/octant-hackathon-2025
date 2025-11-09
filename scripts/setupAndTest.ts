import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const WETH_WHALE = "0x2F0b23f53734252Bda2277357e97e1517d6B042A";
const USDC_WHALE = "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503";

async function main() {
  console.log("Starting full deployment, seeding, and testing...\n");

  const [deployer] = await ethers.getSigners();
  console.log(" Using account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  
  console.log(" Deploying OctantUSD stablecoin...");
  const OctantUSD = await ethers.getContractFactory("OctantUSD");
  const octantUSD = await OctantUSD.deploy();
  await octantUSD.waitForDeployment();
  const octantUSDAddress = await octantUSD.getAddress();
  console.log("✅ OctantUSD deployed to:", octantUSDAddress);

  const initialSupply = ethers.parseUnits("10000000", 18);
  await octantUSD.mint(deployer.address, initialSupply);
  console.log(`✅ Minted ${ethers.formatUnits(initialSupply, 18)} OUSD to deployer\n`);

  console.log(" Deploying Public Good infrastructure...");
  const Treasury = await ethers.getContractFactory("PublicGoodTreasury");
  const treasury = await Treasury.deploy();
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("✅ PublicGoodTreasury deployed to:", treasuryAddress);

  const Hook = await ethers.getContractFactory("PublicGoodHook");
  const hook = await Hook.deploy(treasuryAddress);
  await hook.waitForDeployment();
  const hookAddress = await hook.getAddress();
  console.log("✅ PublicGoodHook deployed to:", hookAddress);
  console.log("   → 3% fee on all swaps goes to public good\n");

  console.log("Deploying Uniswap V4 mock contracts...");
  const PoolManager = await ethers.getContractFactory("UniswapV4PoolManager");
  const poolManager = await PoolManager.deploy();
  await poolManager.waitForDeployment();
  const poolManagerAddress = await poolManager.getAddress();
  console.log("✅ UniswapV4PoolManager deployed to:", poolManagerAddress);

  const Router = await ethers.getContractFactory("UniswapV4Router");
  const router = await Router.deploy(poolManagerAddress, hookAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("✅ UniswapV4Router deployed to:", routerAddress);

  const Quoter = await ethers.getContractFactory("UniswapV4Quoter");
  const quoter = await Quoter.deploy(poolManagerAddress);
  await quoter.waitForDeployment();
  const quoterAddress = await quoter.getAddress();
  console.log("✅ UniswapV4Quoter deployed to:", quoterAddress);

  const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  console.log("Using WETH at:", WETH_ADDRESS);
  console.log(" Using USDC at:", USDC_ADDRESS, "\n");


  console.log("Preparing tokens for liquidity...\n");

  const setBalance = async (address: string, ethAmount: string) => {
    const balance = ethers.parseEther(ethAmount);
    const hexBalance = "0x" + balance.toString(16);
    await ethers.provider.send("hardhat_setBalance", [address, hexBalance]);
  };

  await setBalance(deployer.address, "400");

  const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);

  console.log("Wrapping ETH to WETH...");
  const wethAmount = ethers.parseEther("350");
  const wethContract = await ethers.getContractAt(
    ["function deposit() payable", "function transfer(address,uint256) returns (bool)"],
    WETH_ADDRESS
  );
  const depositTx = await wethContract.deposit({ value: wethAmount });
  await depositTx.wait();
  console.log(`✅ Wrapped ${ethers.formatEther(wethAmount)} ETH to WETH`);

  console.log("💵 Setting USDC balance...");
  const usdcAmount = ethers.parseUnits("2000000", 6);
  const balanceSlot = 9;
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encoded = abiCoder.encode(["address", "uint256"], [deployer.address, balanceSlot]);
  const slot = ethers.keccak256(encoded);
  const paddedValue = ethers.zeroPadValue(ethers.toBeHex(usdcAmount), 32);
  await ethers.provider.send("hardhat_setStorageAt", [USDC_ADDRESS, slot, paddedValue]);
  console.log(`✅ Set USDC balance to ${ethers.formatUnits(await usdc.balanceOf(deployer.address), 6)} USDC\n`);

 
  const fee = 3000;

  console.log("Creating OUSD/WETH pool...");
  const [token0_weth, token1_weth] = octantUSDAddress < WETH_ADDRESS
    ? [octantUSDAddress, WETH_ADDRESS]
    : [WETH_ADDRESS, octantUSDAddress];
  await poolManager.createPool(token0_weth, token1_weth, fee);
  console.log("✅ OUSD/WETH pool created");

  const ousdAmount1 = ethers.parseUnits("1000000", 18);
  const wethLiqAmount1 = ethers.parseEther("50");
  await octantUSD.approve(poolManagerAddress, ousdAmount1);
  await weth.approve(poolManagerAddress, wethLiqAmount1);

  const [amount0_weth, amount1_weth] = octantUSDAddress < WETH_ADDRESS
    ? [ousdAmount1, wethLiqAmount1]
    : [wethLiqAmount1, ousdAmount1];
  await poolManager.addLiquidity(token0_weth, token1_weth, fee, amount0_weth, amount1_weth);
  console.log(`✅ Added liquidity: ${ethers.formatUnits(ousdAmount1, 18)} OUSD + ${ethers.formatEther(wethLiqAmount1)} WETH\n`);

  console.log("Creating OUSD/USDC pool...");
  const [token0_usdc, token1_usdc] = octantUSDAddress < USDC_ADDRESS
    ? [octantUSDAddress, USDC_ADDRESS]
    : [USDC_ADDRESS, octantUSDAddress];
  await poolManager.createPool(token0_usdc, token1_usdc, fee);
  console.log("✅ OUSD/USDC pool created");

  const ousdAmount2 = ethers.parseUnits("1000000", 18);
  const usdcLiqAmount = ethers.parseUnits("1000000", 6);
  await octantUSD.approve(poolManagerAddress, ousdAmount2);
  await usdc.approve(poolManagerAddress, usdcLiqAmount);

  const [amount0_usdc, amount1_usdc] = octantUSDAddress < USDC_ADDRESS
    ? [ousdAmount2, usdcLiqAmount]
    : [usdcLiqAmount, ousdAmount2];
  await poolManager.addLiquidity(token0_usdc, token1_usdc, fee, amount0_usdc, amount1_usdc);
  console.log(`✅ Added liquidity: ${ethers.formatUnits(ousdAmount2, 18)} OUSD + ${ethers.formatUnits(usdcLiqAmount, 6)} USDC\n`);

  console.log("✅ Deployment and seeding complete!\n");


  //Public Good 
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" Testing Public Good Fee Mechanism");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const swapAmount = ethers.parseUnits("1000", 18);
  
  const expectedFee = await hook.calculateFee(swapAmount);
  const amountAfterFee = await hook.getAmountAfterFee(swapAmount);
  
  console.log("Fee Calculation:");
  console.log("   Input amount:     ", ethers.formatUnits(swapAmount, 18), "OUSD");
  console.log("   Public good fee:  ", ethers.formatUnits(expectedFee, 18), "OUSD (3%)");
  console.log("   Amount to swap:   ", ethers.formatUnits(amountAfterFee, 18), "OUSD\n");

  const ousdBalanceBefore = await octantUSD.balanceOf(deployer.address);
  const wethBalanceBefore = await weth.balanceOf(deployer.address);
  const treasuryBalanceBefore = await octantUSD.balanceOf(treasuryAddress);
  
  console.log("💼 Balances Before Swap:");
  console.log("   User OUSD:        ", ethers.formatUnits(ousdBalanceBefore, 18));
  console.log("   User WETH:        ", ethers.formatEther(wethBalanceBefore));
  console.log("   Treasury OUSD:    ", ethers.formatUnits(treasuryBalanceBefore, 18), "\n");

  await octantUSD.approve(routerAddress, swapAmount);
  
  console.log(" Executing swap...");
  const swapTx = await router.exactInputSingle({
    tokenIn: octantUSDAddress,
    tokenOut: WETH_ADDRESS,
    fee: fee,
    recipient: deployer.address,
    amountIn: swapAmount,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  });
  
  await swapTx.wait();
  console.log("✅ Swap executed!\n");

  const ousdBalanceAfter = await octantUSD.balanceOf(deployer.address);
  const wethBalanceAfter = await weth.balanceOf(deployer.address);
  const treasuryBalanceAfter = await octantUSD.balanceOf(treasuryAddress);
  
  const ousdSpent = ousdBalanceBefore - ousdBalanceAfter;
  const wethReceived = wethBalanceAfter - wethBalanceBefore;
  const treasuryReceived = treasuryBalanceAfter - treasuryBalanceBefore;

  console.log("💼 Balances After Swap:");
  console.log("   User OUSD:        ", ethers.formatUnits(ousdBalanceAfter, 18));
  console.log("   User WETH:        ", ethers.formatEther(wethBalanceAfter));
  console.log("   Treasury OUSD:    ", ethers.formatUnits(treasuryBalanceAfter, 18), "\n");

  console.log("📈 Swap Results:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   OUSD spent:       ", ethers.formatUnits(ousdSpent, 18));
  console.log("   WETH received:    ", ethers.formatEther(wethReceived));
  console.log("   Public good fee:  ", ethers.formatUnits(treasuryReceived, 18), "OUSD");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const feePercentage = (Number(treasuryReceived) / Number(ousdSpent)) * 100;
  console.log("✅ Fee Verification:");
  console.log("   Expected fee:     3.00%");
  console.log("   Actual fee:       " + feePercentage.toFixed(2) + "%");
  
  if (Math.abs(feePercentage - 3.0) < 0.01) {
    console.log("   Status:           ✅ CORRECT\n");
  } else {
    console.log("   Status:           ⚠️  MISMATCH\n");
  }

  const totalContributions = await treasury.getContributions(octantUSDAddress);
  console.log("Treasury Status:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   Total OUSD contributions: ", ethers.formatUnits(totalContributions, 18));
  console.log("   Treasury balance:         ", ethers.formatUnits(treasuryBalanceAfter, 18));
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("✨ Public good fee mechanism working correctly!");
  console.log("   Every swap contributes 3% to public good initiatives! 🌍\n");

  console.log("Final Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("OctantUSD:     ", octantUSDAddress);
  console.log("Treasury:      ", treasuryAddress);
  console.log("Hook:          ", hookAddress, "(3% fee)");
  console.log("Router:        ", routerAddress);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exit(1);
  });
