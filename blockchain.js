const { ethers } = require('ethers');
const { Wallet } = require('ethers');
const axios = require("axios");
const { updateTransaction } = require('./dao/transaction');
const Moralis = require('moralis').default;
const { EvmChain } = require('@moralisweb3/evm-utils');
const provider = new ethers.providers.WebSocketProvider('wss://eth-mainnet.g.alchemy.com/v2/5IffUyzDsxLG491em1Ap6YJwHUEoKGDz');
Moralis.start({
    apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjA1NDhjYTYyLTBiZjQtNGVmYi04MWYzLTE5OGZiM2M4NTA5NyIsIm9yZ0lkIjoiMzAyODQ3IiwidXNlcklkIjoiMzEwNzczIiwidHlwZUlkIjoiNTQ0Y2M5ZTItN2M5MC00ZWQ2LTk4NmUtYjlhODY2NWE3ODUyIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE2OTMyNTQ5NzIsImV4cCI6NDg0OTAxNDk3Mn0.FF2QQtMZw9yaXvCwtTvcY_W-jIOimCbbofBaivN8VA8"
});
async function generateWallet() {
    const wallet = await Wallet.createRandom();
    const data = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic.phrase
    }

    return data
};

async function getBalance(address) {
    if (!ethers.utils.isAddress(address)) {
        return ""
    }
    const balanceWei = await provider.getBalance(address);
    const balanceEth = ethers.utils.formatEther(balanceWei);


    return balanceEth
};
async function importWallet(key) {
    let wallet;

    if (key.startsWith("0x")) {
        wallet = new Wallet(key);
    } else {
        const mnemonic = key;
        wallet = Wallet.fromMnemonic(mnemonic);
    }

    return wallet.address;
}






async function buyManually(tokenAddress, recipient, key, amount,) {
    const addresses = {
        WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        recipient: recipient,
    };
    const provider = new ethers.providers.WebSocketProvider('wss://eth-mainnet.g.alchemy.com/v2/5IffUyzDsxLG491em1Ap6YJwHUEoKGDz');
    const account = new ethers.Wallet(key, provider);

    const factory = new ethers.Contract(
        addresses.factory,
        ['event PairCreated(address indexed token0, address indexed token1, address pair, uint)'],
        account
    );
    const router = new ethers.Contract(
        addresses.router,
        [
            'function a(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
            'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
        ],
        account
    );


    const tokenIn = addresses.WETH;
    const tokenOut = tokenAddress;
    const amountIn = ethers.utils.parseUnits(amount, 'ether');

    const amounts = await router.a(amountIn, [tokenIn, tokenOut]);
    const amountOutMin = amounts[1].sub(amounts[1].div(10));

    const tx = await router.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        [tokenIn, tokenOut],
        addresses.recipient,
        Date.now() + 1000 * 60 * 10
    );

    const receipt = await tx.wait();
    console.log('Transaction receipt');
    console.log(receipt);
    return { status: true, hash: tx.hash };
}


async function getTokenInfo(token) {
    try {
        return axios.get("https://api.dexscreener.com/latest/dex/tokens/" + token).then((res) => {
            if (res.data.pairs !== null) {
                let arr = res?.data?.pairs[0];



                return arr;
            }
        }).catch((err) => console.log(err))

    } catch (error) {
        console.log("dd", error)

    }
}

async function getArr(address) {
    try {


        const response = await Moralis.EvmApi.token.getTokenMetadata({
            "chain": "0x1",
            "addresses": [
                address
            ]
        });
        return response.raw[0]
    } catch (e) {
        console.error(e);
        throw (e)
    }
}

async function getBscBalance(address) {
    try {

        const response = await Moralis.EvmApi.balance.getNativeBalance({
            "chain": "0x1",
            "address": address
        });


        return response.raw

    } catch (error) {
        console.log(error);

    }
}

async function buyTokenOnListing(tokenAddress, amountToSpend, recipient, privateKey) {
    const provider = new ethers.providers.WebSocketProvider('wss://eth-mainnet.g.alchemy.com/v2/5IffUyzDsxLG491em1Ap6YJwHUEoKGDz');
    const wallet = new ethers.Wallet(privateKey, provider);
    const routerAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
    const wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    let factoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'

    const router = new ethers.Contract(
        routerAddress,
        [
            'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
            'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
        ],
        wallet
    );

    // Assume the pair already exists and we have the address
    const pairAddress = await ethers.utils.getCreate2Address(
        factoryAddress,
        ethers.utils.solidityKeccak256(['address', 'address'], [tokenAddress, wethAddress].sort()),
        ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['bytes'], [ethers.utils.solidityPack(['address', 'uint24'], [tokenAddress, 3000])]))
    );

    // Listen for liquidity events on the existing pair
    const pair = new ethers.Contract(
        pairAddress,
        ['event Sync(uint112 reserve0, uint112 reserve1)'],
        provider
    );

    pair.on('Sync', async (reserve0, reserve1) => {
        try {
            // Check if liquidity was added to the pair by checking if reserves increased
            console.log(`New liquidity event detected in pair: ${pairAddress}`);
            console.log(`Reserves: ${reserve0.toString()}, ${reserve1.toString()}`);

            // Assuming we want to spend 'amountToSpend' of ETH for the token
            // We need to determine the minimum amount of tokens we expect to receive
            const amountsOut = await router.getAmountsOut(amountToSpend, [wethAddress, tokenAddress]);
            const amountOutMin = amountsOut[1].sub(amountsOut[1].div(10)); // Subtract a 10% slippage not to miss out on rapid price changes

            console.log(`Attempting to buy token ${tokenAddress} for ${amountToSpend.toString()} ETH`);

            // Perform the swap
            const tx = await router.swapExactETHForTokens(
                amountOutMin,
                [wethAddress, tokenAddress],
                recipient,
                Date.now() + 1000 * 60 * 10, // Set the deadline to 10 minutes from the current time
                {
                    value: amountToSpend
                }
            );

            console.log(`Transaction submitted, hash: ${tx.hash}`);

            // Wait for the transaction to be mined
            const receipt = await tx.wait();
            console.log(`Transaction mined, blockNumber: ${receipt.blockNumber}`);
        } catch (error) {
            console.error(`Error during trade execution: ${error}`);
        }
    });
}
async function snipe(address, recipant, key, amount, id) {

    const addresses = {
        WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        recipient: recipant,
    }

    // const mnemonic = '0x74364f4fc491565afbc9bf85e48dc5821cc4833056713338f0ab472b4b9f66ab';

    const provider = new ethers.providers.WebSocketProvider('wss://eth-mainnet.g.alchemy.com/v2/5IffUyzDsxLG491em1Ap6YJwHUEoKGDz');
    const account = new ethers.Wallet(key, provider);
    const factory = new ethers.Contract(
        addresses.factory,
        ['event PairCreated(address indexed token0, address indexed token1, address pair, uint)'],
        account
    );
    const router = new ethers.Contract(
        addresses.router,
        [
            'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
            'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
        ],
        account
    );


    factory.on('PairCreated', async (token0, token1, pairAddress) => {
        console.log(`
    New pair detected
    =================
    token0: ${token0}
    token1: ${token1}
    pairAddress: ${pairAddress}
  `);

        if (token0 === address || token1 === address) {
            let tokenIn, tokenOut;
            if (token0 === addresses.WETH) {
                tokenIn = token0;
                tokenOut = token1;
            }

            if (token1 == addresses.WETH) {
                tokenIn = token1;
                tokenOut = token0;
            }
            if (typeof tokenIn === 'undefined') {
                return;
            }
            const amountIn = ethers.utils.parseUnits(amount, 'ether');
            const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
            const amountOutMin = amounts[1].sub(amounts[1].div(10));
            console.log(`
    Buying new token
    =================
    tokenIn: ${amountIn.toString()} ${tokenIn} (WETH)
    tokenOut: ${amounOutMin.toString()} ${tokenOut}
  `);
            const tx = await router.swapExactTokensForTokens(
                amountIn,
                amountOutMin,
                [tokenIn, tokenOut],
                addresses.recipient,
                Date.now() + 1000 * 60 * 10 //10 minutes
            );
            const receipt = await tx.wait();
            console.log('Transaction receipt');
            updateTransaction(id);
            console.log(receipt);
            await ({ token: msg.myObj.token, name: token?.baseToken?.symbol, user: user?._id });
        } else { console.log(":no") }

    });
}


async function buyTokens({

    tokenOutAddress, // the token you want to buy
    amountIn, // the amount of ETH you want to swap
    walletPrivateKey,
    recipientAddress // should be the same as the wallet's address if you're sending the tokens to yourself
}) {
    // Connect to the Ethereum network
    const provider = new ethers.providers.JsonRpcProvider("https://eth-mainnet.g.alchemy.com/v2/5IffUyzDsxLG491em1Ap6YJwHUEoKGDz");

    // Create a wallet instance
    const wallet = new ethers.Wallet(walletPrivateKey, provider);

    // Uniswap V2 Router contract instance
    const router = new ethers.Contract(
        "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        [
            'function getAmountsOut(uint amountIn, address[] memory path) external view returns (uint[] memory amounts)',
            'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)'
        ],
        wallet
    );

    // Set up the transaction parameters
    const amountInWei = ethers.utils.parseEther(amountIn.toString());

    // The path is an array of token addresses.
    // This path array will contain the WETH address and the token's address
    const path = [
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        tokenOutAddress
    ];


    const amountsOutMin = await router.getAmountsOut(amountInWei, path);
    const amountOutMin = amountsOutMin[1].sub(amountsOutMin[1].div(10));
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    // Now we can perform the swap
    const tx = await router.swapExactETHForTokens(
        amountOutMin,
        path,
        recipientAddress,
        deadline,
        {
            value: amountInWei,
            gasLimit: ethers.utils.hexlify(200000), // You should adjust the gas limit to a suitable amount
            gasPrice: ethers.utils.hexlify(parseInt(await provider.getGasPrice())) // Or use provider.getGasPrice()
        }
    );

    console.log(`Transaction hash: ${tx.hash}`);

    // The transaction is now sent, and we can wait for it to be mined
    const receipt = await tx.wait();

    console.log(`Transaction was mined in block ${receipt.blockNumber}`);
}


module.exports = {
    generateWallet,
    getBalance,
    importWallet,
    snipe,
    buyManually,
    getTokenInfo,
    getArr,
    buyTokenOnListing,
    buyTokens,
    getBscBalance
};