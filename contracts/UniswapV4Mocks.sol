// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Interface for PublicGoodHook
interface IPublicGoodHook {
    function beforeSwap(address tokenIn, uint256 amountIn, address swapper) external returns (uint256 amountAfterFee);
}

/**
 * @title UniswapV4PoolManager (Mock)
 * @dev Simplified mock implementing minimal Uniswap V4 pool management
 * Real V4: https://github.com/Uniswap/v4-core
 */
contract UniswapV4PoolManager {
    using SafeERC20 for IERC20;

    struct PoolKey {
        address token0;
        address token1;
        uint24 fee;
    }

    struct Pool {
        uint256 reserve0;
        uint256 reserve1;
        uint256 totalLiquidity;
        bool initialized;
    }

    mapping(bytes32 => Pool) public pools;

    event PoolCreated(address indexed token0, address indexed token1, uint24 fee, bytes32 poolId);
    event LiquidityAdded(bytes32 indexed poolId, uint256 amount0, uint256 amount1, uint256 liquidity);
    event Swap(bytes32 indexed poolId, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);

    function getPoolId(PoolKey memory key) public pure returns (bytes32) {
        return keccak256(abi.encode(key.token0, key.token1, key.fee));
    }

    function createPool(address token0, address token1, uint24 fee) external returns (bytes32) {
        require(token0 < token1, "Tokens must be sorted");
        PoolKey memory key = PoolKey(token0, token1, fee);
        bytes32 poolId = getPoolId(key);
        require(!pools[poolId].initialized, "Pool already exists");

        pools[poolId].initialized = true;
        emit PoolCreated(token0, token1, fee, poolId);
        return poolId;
    }

    function addLiquidity(
        address token0,
        address token1,
        uint24 fee,
        uint256 amount0,
        uint256 amount1
    ) external returns (uint256 liquidity) {
        require(token0 < token1, "Tokens must be sorted");
        PoolKey memory key = PoolKey(token0, token1, fee);
        bytes32 poolId = getPoolId(key);
        Pool storage pool = pools[poolId];
        require(pool.initialized, "Pool not initialized");

        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1);

        if (pool.totalLiquidity == 0) {
            liquidity = sqrt(amount0 * amount1);
        } else {
            liquidity = min(
                (amount0 * pool.totalLiquidity) / pool.reserve0,
                (amount1 * pool.totalLiquidity) / pool.reserve1
            );
        }

        pool.reserve0 += amount0;
        pool.reserve1 += amount1;
        pool.totalLiquidity += liquidity;

        emit LiquidityAdded(poolId, amount0, amount1, liquidity);
        return liquidity;
    }

    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn
    ) public view returns (uint256) {
        (address token0, address token1) = tokenIn < tokenOut ? (tokenIn, tokenOut) : (tokenOut, tokenIn);
        PoolKey memory key = PoolKey(token0, token1, fee);
        bytes32 poolId = getPoolId(key);
        Pool memory pool = pools[poolId];
        require(pool.initialized, "Pool not initialized");

        bool isToken0In = tokenIn == token0;
        uint256 reserveIn = isToken0In ? pool.reserve0 : pool.reserve1;
        uint256 reserveOut = isToken0In ? pool.reserve1 : pool.reserve0;

        // Constant product formula with fee
        uint256 amountInWithFee = amountIn * (1000000 - fee);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000000) + amountInWithFee;
        return numerator / denominator;
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient
    ) external returns (uint256 amountOut) {
        (address token0, address token1) = tokenIn < tokenOut ? (tokenIn, tokenOut) : (tokenOut, tokenIn);
        PoolKey memory key = PoolKey(token0, token1, fee);
        bytes32 poolId = getPoolId(key);
        Pool storage pool = pools[poolId];
        require(pool.initialized, "Pool not initialized");

        amountOut = getAmountOut(tokenIn, tokenOut, fee, amountIn);
        require(amountOut >= amountOutMin, "Insufficient output amount");

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).safeTransfer(recipient, amountOut);

        bool isToken0In = tokenIn == token0;
        if (isToken0In) {
            pool.reserve0 += amountIn;
            pool.reserve1 -= amountOut;
        } else {
            pool.reserve1 += amountIn;
            pool.reserve0 -= amountOut;
        }

        emit Swap(poolId, tokenIn, tokenOut, amountIn, amountOut);
        return amountOut;
    }

    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}

/**
 * @title UniswapV4Router (Mock)
 * @dev Simplified router for single and multi-hop swaps
 */
contract UniswapV4Router {
    using SafeERC20 for IERC20;

    UniswapV4PoolManager public immutable poolManager;
    IPublicGoodHook public immutable publicGoodHook;

    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96; // Unused in this mock
    }

    struct ExactInputParams {
        bytes path; // Encoded as: token0, fee0, token1, fee1, token2...
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    constructor(address _poolManager, address _publicGoodHook) {
        poolManager = UniswapV4PoolManager(_poolManager);
        publicGoodHook = IPublicGoodHook(_publicGoodHook);
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external returns (uint256 amountOut) {
        // Transfer tokens from user to router
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        
        // Call hook to collect public good fee (3%)
        IERC20(params.tokenIn).approve(address(publicGoodHook), params.amountIn);
        uint256 amountAfterFee = publicGoodHook.beforeSwap(params.tokenIn, params.amountIn, msg.sender);
        
        // Approve pool manager for the amount after fee
        IERC20(params.tokenIn).approve(address(poolManager), amountAfterFee);

        // Execute swap with the amount after fee deduction
        amountOut = poolManager.swap(
            params.tokenIn,
            params.tokenOut,
            params.fee,
            amountAfterFee,
            params.amountOutMinimum,
            params.recipient
        );

        return amountOut;
    }

    function exactInput(ExactInputParams calldata params) external returns (uint256 amountOut) {
        (address[] memory path, uint24[] memory fees) = decodePath(params.path);
        require(path.length >= 2, "Invalid path");

        // Transfer initial tokens from user
        IERC20(path[0]).safeTransferFrom(msg.sender, address(this), params.amountIn);
        
        // Call hook for first hop to collect public good fee (3%)
        IERC20(path[0]).approve(address(publicGoodHook), params.amountIn);
        uint256 amountIn = publicGoodHook.beforeSwap(path[0], params.amountIn, msg.sender);

        // Execute multi-hop swap
        for (uint256 i = 0; i < path.length - 1; i++) {
            IERC20(path[i]).approve(address(poolManager), amountIn);
            
            address recipient = i == path.length - 2 ? params.recipient : address(this);
            
            amountOut = poolManager.swap(
                path[i],
                path[i + 1],
                fees[i],
                amountIn,
                0, // No slippage check on intermediate hops
                recipient
            );
            
            amountIn = amountOut;
        }

        require(amountOut >= params.amountOutMinimum, "Insufficient output amount");
        return amountOut;
    }

    function decodePath(bytes memory path) internal pure returns (address[] memory tokens, uint24[] memory fees) {
        require(path.length >= 43, "Path too short"); // min: 20 + 3 + 20
        uint256 numHops = (path.length - 20) / 23;
        tokens = new address[](numHops + 1);
        fees = new uint24[](numHops);

        uint256 offset = 0;
        for (uint256 i = 0; i <= numHops; i++) {
            tokens[i] = toAddress(path, offset);
            offset += 20;
            if (i < numHops) {
                fees[i] = toUint24(path, offset);
                offset += 3;
            }
        }
    }

    function toAddress(bytes memory data, uint256 offset) internal pure returns (address addr) {
        require(data.length >= offset + 20, "toAddress_outOfBounds");
        assembly {
            addr := mload(add(add(data, 20), offset))
        }
    }

    function toUint24(bytes memory data, uint256 offset) internal pure returns (uint24 value) {
        require(data.length >= offset + 3, "toUint24_outOfBounds");
        assembly {
            value := mload(add(add(data, 3), offset))
        }
    }
}

/**
 * @title UniswapV4Quoter (Mock)
 * @dev Returns quotes for swaps without executing them
 */
contract UniswapV4Quoter {
    UniswapV4PoolManager public immutable poolManager;

    constructor(address _poolManager) {
        poolManager = UniswapV4PoolManager(_poolManager);
    }

    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96 // Unused in this mock
    ) external view returns (uint256 amountOut) {
        return poolManager.getAmountOut(tokenIn, tokenOut, fee, amountIn);
    }

    function quoteExactInput(
        bytes memory path,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        (address[] memory tokens, uint24[] memory fees) = decodePath(path);
        
        uint256 currentAmount = amountIn;
        for (uint256 i = 0; i < tokens.length - 1; i++) {
            currentAmount = poolManager.getAmountOut(tokens[i], tokens[i + 1], fees[i], currentAmount);
        }
        
        return currentAmount;
    }

    function decodePath(bytes memory path) internal pure returns (address[] memory tokens, uint24[] memory fees) {
        require(path.length >= 43, "Path too short");
        uint256 numHops = (path.length - 20) / 23;
        tokens = new address[](numHops + 1);
        fees = new uint24[](numHops);

        uint256 offset = 0;
        for (uint256 i = 0; i <= numHops; i++) {
            tokens[i] = toAddress(path, offset);
            offset += 20;
            if (i < numHops) {
                fees[i] = toUint24(path, offset);
                offset += 3;
            }
        }
    }

    function toAddress(bytes memory data, uint256 offset) internal pure returns (address addr) {
        require(data.length >= offset + 20, "toAddress_outOfBounds");
        assembly {
            addr := mload(add(add(data, 20), offset))
        }
    }

    function toUint24(bytes memory data, uint256 offset) internal pure returns (uint24 value) {
        require(data.length >= offset + 3, "toUint24_outOfBounds");
        assembly {
            value := mload(add(add(data, 3), offset))
        }
    }
}