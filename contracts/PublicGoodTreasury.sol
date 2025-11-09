// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PublicGoodTreasury
 * @dev Collects and manages fees from swaps for public good initiatives
 * Tracks contributions per token and allows owner to withdraw for public good projects
 */
contract PublicGoodTreasury is Ownable {
    using SafeERC20 for IERC20;

    // Track total contributions per token
    mapping(address => uint256) public totalContributions;
    
    // Track total contributions across all tokens (in USD equivalent, simplified)
    uint256 public totalContributionsUSD;

    event FeeCollected(address indexed token, uint256 amount, address indexed from);
    event FundsWithdrawn(address indexed token, uint256 amount, address indexed to, string purpose);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Receives fees from the hook contract
     * @param token Address of the token being contributed
     * @param amount Amount of tokens contributed
     */
    function collectFee(address token, uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        totalContributions[token] += amount;
        // Simplified: assume 1:1 USD for demo purposes
        totalContributionsUSD += amount;
        
        emit FeeCollected(token, amount, msg.sender);
    }

    /**
     * @dev Allows owner to withdraw funds for public good projects
     * @param token Address of the token to withdraw
     * @param amount Amount to withdraw
     * @param recipient Address to receive the funds
     * @param purpose Description of the public good purpose
     */
    function withdrawForPublicGood(
        address token,
        uint256 amount,
        address recipient,
        string calldata purpose
    ) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");
        require(totalContributions[token] >= amount, "Insufficient balance");
        
        totalContributions[token] -= amount;
        IERC20(token).safeTransfer(recipient, amount);
        
        emit FundsWithdrawn(token, amount, recipient, purpose);
    }

    /**
     * @dev Returns the balance of a specific token in the treasury
     * @param token Address of the token
     */
    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @dev Returns total contributions for a specific token
     * @param token Address of the token
     */
    function getContributions(address token) external view returns (uint256) {
        return totalContributions[token];
    }
}
