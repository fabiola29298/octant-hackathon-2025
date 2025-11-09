// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./PublicGoodTreasury.sol";

/**
 * @title PublicGoodHook
 * @dev Uniswap V4-style hook that collects a 3% fee on swaps for public good
 * This hook is called before swaps to deduct the fee and send it to the treasury
 */
contract PublicGoodHook {
    using SafeERC20 for IERC20;

    PublicGoodTreasury public immutable treasury;
    uint256 public constant PUBLIC_GOOD_FEE_BPS = 300; // 3% = 300 basis points
    uint256 public constant BPS_DENOMINATOR = 10000;

    event PublicGoodFeeCollected(
        address indexed tokenIn,
        uint256 amountIn,
        uint256 feeAmount,
        address indexed swapper
    );

    constructor(address _treasury) {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = PublicGoodTreasury(_treasury);
    }

    /**
     * @dev Called before a swap to collect the public good fee
     * @param tokenIn The input token address
     * @param amountIn The input amount before fee
     * @param swapper The address performing the swap (for event logging)
     * @return amountAfterFee The amount after deducting the public good fee
     * 
     * Note: Router must transfer tokens to this contract first and approve this amount
     */
    function beforeSwap(
        address tokenIn,
        uint256 amountIn,
        address swapper
    ) external returns (uint256 amountAfterFee) {
        require(amountIn > 0, "Amount must be greater than 0");
        
        // Calculate 3% fee
        uint256 feeAmount = (amountIn * PUBLIC_GOOD_FEE_BPS) / BPS_DENOMINATOR;
        amountAfterFee = amountIn - feeAmount;
        
        // Transfer fee from router (msg.sender) to treasury
        if (feeAmount > 0) {
            IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), feeAmount);
            IERC20(tokenIn).approve(address(treasury), feeAmount);
            treasury.collectFee(tokenIn, feeAmount);
            
            emit PublicGoodFeeCollected(tokenIn, amountIn, feeAmount, swapper);
        }
        
        return amountAfterFee;
    }

    /**
     * @dev Returns the fee amount for a given input
     * @param amountIn The input amount
     * @return feeAmount The calculated fee (3%)
     */
    function calculateFee(uint256 amountIn) external pure returns (uint256 feeAmount) {
        return (amountIn * PUBLIC_GOOD_FEE_BPS) / BPS_DENOMINATOR;
    }

    /**
     * @dev Returns the amount after fee deduction
     * @param amountIn The input amount
     * @return amountAfterFee The amount after deducting 3% fee
     */
    function getAmountAfterFee(uint256 amountIn) external pure returns (uint256 amountAfterFee) {
        uint256 feeAmount = (amountIn * PUBLIC_GOOD_FEE_BPS) / BPS_DENOMINATOR;
        return amountIn - feeAmount;
    }
}
