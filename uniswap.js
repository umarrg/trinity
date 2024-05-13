require('dotenv').config();
const { ethers, constants } = require('ethers');

const provider = new ethers.providers.JsonRpcProvider("https://eth-mainnet.g.alchemy.com/v2/pnWkQTCZ2k37q1RndnwZG0rkA660Yy8R");

// async function snipeToken({ privateKey, token, amount }) {
//     const wallet = new ethers.Wallet(privateKey, provider);

//     // Uniswap V2 Router address
//     const UNISWAP_V2_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
//     const TARGET_TOKEN_ADDRESS = token;

//     const amountToSwap = ethers.utils.parseEther(amount);

//     // Setup the Uniswap router contract interface
//     const uniswapRouterAbi = [
//         'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
//         'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)'
//     ];
//     const routerContract = new ethers.Contract(UNISWAP_V2_ROUTER, uniswapRouterAbi, wallet);
//     const weth = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
//     console.log('Attempting to snipe...');

//     try {
//         // Approve the router to spend your ETH
//         // Not necessary for ETH, only for ERC20 tokens

//         // Get the amount of tokens you would receive
//         let amounts = await routerContract.getAmountsOut(amountToSwap, [weth, TARGET_TOKEN_ADDRESS]);

//         // Set a minimum amount of tokens you want to receive (slippage tolerance)
//         let amountOutMin = amounts[1].sub(amounts[1].div(10)); // Subtracting 10% slippage tolerance

//         console.log(`Swapping ${ethers.utils.formatEther(amountToSwap)} ETH for at least ${ethers.utils.formatEther(amountOutMin)} tokens`);

//         // Make the swap
//         const tx = await routerContract.swapExactETHForTokens(
//             amountOutMin,
//             [weth, TARGET_TOKEN_ADDRESS],
//             wallet.address,
//             Math.floor(Date.now() / 1000) + 60 * 10, // 10 minutes from the current Unix time
//             { value: amountToSwap }
//         );

//         console.log(`Transaction hash: ${tx.hash}`);
//         console.log('Transaction sent! Waiting for confirmation...');

//         // Wait for the transaction to be mined
//         const receipt = await tx.wait();

//         console.log(receipt);

//         console.log('Transaction confirmed!');
//         return tx.hash;

//         // console.log(`Swapped ${ethers.utils.formatEther(amountToSwap)} ETH for ${ethers.utils.formatEther(receipt.events[2].args[1])} tokens`);
//     } catch (error) {
//         console.error('Error sniping token:', error);
//         console.error(error.reason);
//     }
// }
async function snipeToken({ privateKey, token, amount, ownerAddress }) {
    const wallet = new ethers.Wallet(privateKey, provider);


    const UNISWAP_V2_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
    const TARGET_TOKEN_ADDRESS = token;

    const amountToSwap = ethers.utils.parseEther(amount);

    // Setup the Uniswap router contract interface
    const uniswapRouterAbi = [
        'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
        'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)'
    ];
    const routerContract = new ethers.Contract(
        UNISWAP_V2_ROUTER,
        [
            'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
            'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
        ],
        wallet
    );
    const weth = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const erc20Abi = [
        'function transfer(address to, uint amount) returns (bool)',
    ];
    console.log('Attempting to snipe...');

    try {

        let amounts = await routerContract.getAmountsOut(amountToSwap, [weth, TARGET_TOKEN_ADDRESS]);

        // Set a minimum amount of tokens you want to receive (slippage tolerance)
        let amountOutMin = amounts[1].sub(amounts[1].div(10)); // Subtracting 10% slippage tolerance

        console.log(`Swapping ${ethers.utils.formatEther(amountToSwap)} ETH for at least ${ethers.utils.formatEther(amountOutMin)} tokens`);

        // Make the swap
        const tx = await routerContract.swapExactTokensForTokens(
            amountToSwap,
            amountOutMin,
            [weth, TARGET_TOKEN_ADDRESS],
            wallet.address,
            Date.now() + 1000 * 60 * 10 //10 minutes
        );
        // const tx = await routerContract.swapExactETHForTokens(
        //     amountOutMin,
        //     [weth, TARGET_TOKEN_ADDRESS],
        //     wallet.address,
        //     Math.floor(Date.now() / 1000) + 60 * 10, // 10 minutes from the current Unix time
        //     { value: amountToSwap, gasLimit: ethers.utils.hexlify(500000), gasPrice: ethers.utils.parseUnits("54", "gwei"), },

        // );

        console.log(`Transaction hash: ${tx.hash}`);
        console.log('Transaction sent! Waiting for confirmation...');

        // Wait for the transaction to be mined
        const receipt = await tx.wait();

        console.log(receipt);

        console.log('Transaction confirmed!');
        // const tokenAmountReceived = await receipt.events.find(event => event.address.toLowerCase() === TARGET_TOKEN_ADDRESS.toLowerCase()).args[1];

        // // Calculate the fee to send to the owner
        // const fee = await tokenAmountReceived.div(100); // 1% fee

        // // Create a contract instance of the token
        // const tokenContract = new ethers.Contract(TARGET_TOKEN_ADDRESS, erc20Abi, wallet);

        // // Send the fee to the owner's address
        // const transferTx = await tokenContract.transfer(ownerAddress, fee);
        // console.log(`Fee transfer transaction hash: ${transferTx.hash}`);
        // await transferTx.wait();
        // console.log(`Sent ${ethers.utils.formatEther(fee)} tokens as a fee to the owner's address.`);
        return { status: true, hash: tx.hash };

    } catch (error) {
        // console.error('Error sniping token:', error);
        console.error(error.reason);
        return error.reason;
    }
}

async function swapUniswap(privateKey, token, amount) {
    try {
        const UNISWAP_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
        const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
        const provider = new ethers.providers.WebSocketProvider('wss://eth-mainnet.g.alchemy.com/v2/5IffUyzDsxLG491em1Ap6YJwHUEoKGDz');

        const SLIPPAGE_PERCENTAGE = 50;
        const DEADLINE = Date.now() + 1000 * 60 * 5;

        const account = new ethers.Wallet(privateKey, provider);


        const amountToSwap = ethers.utils.parseEther(amount.toString());


        const routerContract = new ethers.Contract(
            UNISWAP_ROUTER,
            [
                'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
                'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
            ],
            account
        );



        const amounts = await routerContract.getAmountsOut(amountToSwap, [WETH_ADDRESS, token]);

        const amountOutMin = amounts[1].sub(amounts[1].div(10));





        const tx = await routerContract.swapExactTokensForTokens(
            amountToSwap,
            amountOutMin,
            [WETH_ADDRESS, token],
            account.address,
            Date.now() + 1000 * 60 * 10,
            {
                'gasLimit': 300000,
                'gasPrice': ethers.utils.parseUnits('65', 'gwei'),

            }
        );

        const receipt = await tx.wait();
        console.log("Transaction Receipt:", receipt);
        return { status: true, hash: tx.hash };
    } catch (error) {
        console.error("Error in swapUniswap:", error.message || error);
        return { status: false, error: error.message || error };
    }
}

async function swap(privateKey, tokenOut, amt) {
    const amountIn = ethers.utils.parseUnits(amt, 18)
    const ABI_UNISWAP = require("./abi.uniswap.json");
    const ROUTER_ADDRESS = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
    const tokenIn = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const provider = new ethers.providers.WebSocketProvider('wss://eth-mainnet.g.alchemy.com/v2/5IffUyzDsxLG491em1Ap6YJwHUEoKGDz');
    const signer = new ethers.Wallet(privateKey, provider);
    const router = new ethers.Contract(ROUTER_ADDRESS, ABI_UNISWAP, signer);
    const wallet = new ethers.Wallet(privateKey, provider);
    const params = {
        tokenIn,
        tokenOut,
        fee: 3000,//poolFee = 0.3% * 10000
        recipient: wallet.address,
        deadline: (Date.now() / 1000) + 10,
        amountIn,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0
    }

    try {
        const tx = await router.exactInputSingle(params, {
            from: wallet.address,
            'gasPrice': ethers.utils.parseUnits('65', 'gwei'),
            gasLimit: 600000
        });
        console.log("Swapping at " + tx.hash);
        // const receipt = await tx.wait();

        // const amountOut = ethers.toBigInt(receipt.logs[0].data);
        // console.log("Received " + ethers.formatUnits(amountOut, "ether"));
        return { status: true, hash: tx.hash };
    } catch (error) {
        console.error("Error in swapUniswap:", error.message || error);
        return { status: false, error: error.message || error };
    }
}
module.exports = {
    snipeToken,
    swapUniswap,
    swap,
};