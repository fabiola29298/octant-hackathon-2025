// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title OctantUSD
 * @dev Mintable ERC20 stablecoin with 1:1 USD peg (simulated)
 * Only the owner can mint new tokens
 */
contract OctantUSD is ERC20, Ownable {
    constructor() ERC20("Octant USD", "OUSD") Ownable(msg.sender) {
        // Initial supply is 0; owner mints as needed
    }

    /**
     * @dev Mints new Octant tokens to a specified address
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint (in wei, 18 decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Returns the number of decimals (18)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}