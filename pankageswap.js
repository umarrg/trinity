const { ethers } = require("ethers");

const pancakeRouterAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";


const pancakeRouterAbi = [
    'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];


async function snipeTokenOnPancakeSwap({ tokenOut, amountIn, slippage, privateKey }) {
    const tokenIn = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c"
    const provider = new ethers.providers.JsonRpcProvider('https://mainnet.infura.io/v3/f14e3666304f40ecaff4e598d23587e2');
    const wallet = new ethers.Wallet(privateKey, provider);
    const signer = wallet.connect(provider);
    const pancakeRouterContract = new ethers.Contract(pancakeRouterAddress, pancakeRouterAbi, signer);

    try {
        const amountInWei = ethers.utils.parseUnits(amountIn, 'ether');

        let amounts = await pancakeRouterContract.getAmountsOut(amountInWei, [tokenIn, tokenOut]);

        let amountOutMin = amounts[1].sub(amounts[1].mul(slippage).div(100));
        const tx = await pancakeRouterContract.swapExactTokensForTokens(
            amountInWei,
            amountOutMin,
            [tokenIn, tokenOut],
            wallet.address,
            Math.floor(Date.now() / 1000) + 60 * 10,
            {
                gasLimit: ethers.utils.hexlify(500000),
                gasPrice: ethers.utils.parseUnits('5', 'gwei')
            }
        );

        const receipt = await tx.wait();
        console.log(`Transaction confirmed! Hash: ${receipt.transactionHash}`);

        return receipt;
    } catch (error) {
        console.error(`Error during the swap: ${error}`);
        throw error;
    }
}
module.exports = {
    snipeTokenOnPancakeSwap
};
// Example usage:
// snipeTokenOnPancakeSwap({
//     tokenIn: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', // WBNB
//     tokenOut: '0xe9e7cea3dedca5984780bafc599bd69add087d56', // BUSD
//     amountIn: '1', // 1 WBNB
//     slippage: 1 // 1% slippage tolerance
// }).then(receipt => {
//     console.log(receipt);
// }).catch(error => {
//     console.error(error);
// });
