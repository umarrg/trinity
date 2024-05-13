const { Keypair, Connection } = require('@solana/web3.js');

async function generateWallet() {
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    console.log("Generated Public Key:", keypair);
    return keypair;
}

async function importWallet(secretKey) {
    // Import the keypair using the secret key
    const importedKeypair = Keypair.fromSecretKey(secretKey);
    return importedKeypair;
}

async function main() {
    try {
        // Generate a new keypair
        const generatedKeypair = await generateWallet();

        // You can store the secret key in a secure manner (not logged or exposed)
        const secretKey = generatedKeypair.secretKey;

        // Import the keypair using the secret key
        const importedKeypair = await importWallet(secretKey);

        // Check if the imported keypair's public key matches the generated one
        if (importedKeypair.publicKey.equals(generatedKeypair.publicKey)) {
            console.log("Import successful!");
        } else {
            console.log("Import failed!");
        }

        // Connect to a Solana cluster
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

        // Get the balance of the imported keypair
        const balance = await connection.getBalance(importedKeypair.publicKey);

        console.log("Wallet Balance:", balance);
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
