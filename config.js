const { Keypair, Connection, PublicKey } = require('@solana/web3.js');
const { default: axios } = require('axios');
const { clusterApiUrl } = require("@solana/web3.js");


async function importWallet(secretKey) {
    try {
        const secretKeyUint8 = Uint8Array.from(secretKey.split(',').map(Number));
        const importedKeypair = Keypair.fromSecretKey(secretKeyUint8);
        return importedKeypair;
    } catch (error) {
        console.error("Error importing wallet:", error);
        throw error;
    }
}
async function generateWallet() {
    const keypair = Keypair.generate();
    return keypair;
}
async function getSolBalance(walletAddress) {
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    return balance / 1e9;
}

async function getSolPriceInUSD() {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    return response.data.solana.usd;
}





module.exports = {
    generateWallet,
    getSolPriceInUSD,
    getSolBalance,
    importWallet
};