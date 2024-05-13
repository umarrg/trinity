const { Keypair, Connection } = require('@solana/web3.js');
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



module.exports = {
    generateWallet,
    importWallet
};