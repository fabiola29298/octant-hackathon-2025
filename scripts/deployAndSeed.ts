import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const WETH_WHALE = "0x2F0b23f53734252Bda2277357e97e1517d6B042A";
const USDC_WHALE = "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503";

async function main() {
  console.log(" Starting deployment and seeding process...\n");

  const [deployer] = await ethers.getSigners();
  console.log(" Using account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  console.log(" Deploying OctantUSD stablecoin...");
  const OctantUSD = await ethers.getContractFactory("OctantUSD");
  const octantUSD = await OctantUSD.deploy();
  await octantUSD.waitForDeployment();
  const octantUSDAddress = await octantUSD.getAddress();
  console.log("✅ OctantUSD deployed to:", octantUSDAddress);

  // Mint initial supply
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

  console.log(" Deploying Uniswap V4 mock contracts...");
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
  console.log("📍 Using WETH at:", WETH_ADDRESS);
  console.log("📍 Using USDC at:", USDC_ADDRESS, "\n");

  // Save deployment addresses
  const deployments = {
    octantUSD: octantUSDAddress,
    treasury: treasuryAddress,
    hook: hookAddress,
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
  console.log("💾 Deployment addresses saved to deployments.json\n");


  console.log(" Preparing to seed liquidity pools...\n");

  // Helper function to set balance
  const setBalance = async (address: string, ethAmount: string) => {
    const balance = ethers.parseEther(ethAmount);
    const hexBalance = "0x" + balance.toString(16);
    await ethers.provider.send("hardhat_setBalance", [address, hexBalance]);
  };

  // Fund deployer with ETH
  await setBalance(deployer.address, "400");

  const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);

  // Wrap ETH to WETH
  console.log(" Wrapping ETH to WETH...");
  const wethAmount = ethers.parseEther("350");
  const wethContract = await ethers.getContractAt(
    ["function deposit() payable", "function transfer(address,uint256) returns (bool)"],
    WETH_ADDRESS
  );
  const depositTx = await wethContract.deposit({ value: wethAmount });
  await depositTx.wait();
  console.log(`✅ Wrapped ${ethers.formatEther(wethAmount)} ETH to WETH`);

  // Get USDC via storage manipulation
  console.log("💵 Setting USDC balance...");
  const usdcAmount = ethers.parseUnits("2000000", 6); // 2M USDC (need 1M for OCT/USDC + 100K for USDC/WETH)
  const balanceSlot = 9;
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encoded = abiCoder.encode(["address", "uint256"], [deployer.address, balanceSlot]);
  const slot = ethers.keccak256(encoded);
  const paddedValue = ethers.zeroPadValue(ethers.toBeHex(usdcAmount), 32);
  await ethers.provider.send("hardhat_setStorageAt", [USDC_ADDRESS, slot, paddedValue]);
  const usdcBalance = await usdc.balanceOf(deployer.address);
  console.log(`✅ Set USDC balance to ${ethers.formatUnits(usdcBalance, 6)} USDC\n`);

 //Create Pool and Liquidity 
  const fee = 3000; // 0.3%

  // Create OUSD/WETH pool
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

  // Create OUSD/USDC pool
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

  // Create USDC/WETH pool
  console.log("Creating USDC/WETH pool...");
  const [token0_usdc_weth, token1_usdc_weth] = USDC_ADDRESS < WETH_ADDRESS
    ? [USDC_ADDRESS, WETH_ADDRESS]
    : [WETH_ADDRESS, USDC_ADDRESS];
  await poolManager.createPool(token0_usdc_weth, token1_usdc_weth, fee);
  console.log("✅ USDC/WETH pool created");

  const usdcLiqAmount2 = ethers.parseUnits("100000", 6);
  const wethLiqAmount2 = ethers.parseEther("50");
  await usdc.approve(poolManagerAddress, usdcLiqAmount2);
  await weth.approve(poolManagerAddress, wethLiqAmount2);

  const [amount0_usdc_weth, amount1_usdc_weth] = USDC_ADDRESS < WETH_ADDRESS
    ? [usdcLiqAmount2, wethLiqAmount2]
    : [wethLiqAmount2, usdcLiqAmount2];
  await poolManager.addLiquidity(token0_usdc_weth, token1_usdc_weth, fee, amount0_usdc_weth, amount1_usdc_weth);
  console.log(`✅ Added liquidity: ${ethers.formatUnits(usdcLiqAmount2, 6)} USDC + ${ethers.formatEther(wethLiqAmount2)} WETH\n`);

  //Deployment Summary 
  console.log("Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("OctantUSD:    ", octantUSDAddress);
  console.log("Treasury:     ", treasuryAddress);
  console.log("Hook:         ", hookAddress, "(3% public good fee)");
  console.log("PoolManager:  ", poolManagerAddress);
  console.log("Router:       ", routerAddress);
  console.log("Quoter:       ", quoterAddress);
  console.log("WETH:         ", WETH_ADDRESS);
  console.log("USDC:         ", USDC_ADDRESS);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log("\n Final Balances:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("OUSD: ", ethers.formatUnits(await octantUSD.balanceOf(deployer.address), 18));
  console.log("WETH: ", ethers.formatEther(await weth.balanceOf(deployer.address)));
  console.log("USDC: ", ethers.formatUnits(await usdc.balanceOf(deployer.address), 6));
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n✨ All done! Swaps will now contribute 3% to public good treasury.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment and seeding failed:", error);
    process.exit(1);
  });
