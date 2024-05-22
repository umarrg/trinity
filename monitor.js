require('dotenv').config();
require("./connections/connection.mongo")();
const { Connection, Keypair, PublicKey, SystemProgram, Transaction } = require('@solana/web3.js');
const { getActiveTrade } = require('./dao/trade');
const { getWalletbyUser } = require('./dao/wallet');

const connection = new Connection(process.env.SOLANA_ENDPOINT, 'confirmed');

async function monitorAndReplicateTrades() {
    try {
        const activeTrades = await getActiveTrade();

        for (const trade of activeTrades) {
            console.log("trade", trade.user._id);
            const { wallet, user } = trade;

            connection.onAccountChange(new PublicKey(wallet), async (accountInfo, context) => {
                try {
                    const transactions = await connection.getConfirmedSignaturesForAddress2(new PublicKey(wallet), { limit: 1 });
                    if (transactions.length > 0) {
                        const txSignature = transactions[0].signature;
                        const txDetails = await connection.getConfirmedTransaction(txSignature);

                        if (txDetails) {
                            console.log('New transaction detected for wallet:', wallet);
                            await replicateTransaction(txDetails, user._id);
                        }
                    }
                } catch (error) {
                    console.error('Error monitoring address:', error);
                }
            });
        }
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
    }
}

async function replicateTransaction(txDetails, user) {
    const wallets = await getWalletbyUser(user);
    const account = wallets[0];

    const instructions = txDetails.transaction._message.instructions;

    const secretKeyUint8 = Uint8Array.from(account.privateKey.split(',').map(Number));
    const keypair = Keypair.fromSecretKey(secretKeyUint8);


    for (const ix of instructions) {
        console.log('Detected programId:', JSON.stringify(ix, null, 2));

        const programAccountId = txDetails.transaction._message.accountKeys[ix.programIdIndex].toBase58();

        console.log('Program ID:', programAccountId);

        const instructionData = ix.data;


        if (programAccountId === SystemProgram.programId.toBase58()) {
            const data = ix.data;
            if (ix.keys && Array.isArray(ix.keys)) {
                console.log("keys>>>>");

                const keys = ix.keys.map(key => key.pubkey.toBase58());

                const fromPubkey = keys[0];
                const toPubkey = keys[1];

                const amount = new BigNumber(data, 10).toNumber();

                if (fromPubkey === account.address) {
                    console.log(`Replicating transaction: Sending ${amount} lamports from ${fromPubkey} to ${toPubkey}`);

                    const transferIx = SystemProgram.transfer({
                        fromPubkey: keypair.publicKey,
                        toPubkey: new PublicKey(toPubkey),
                        lamports: amount
                    });

                    const tx = new Transaction().add(transferIx);
                    try {
                        const txSignature = await web3.sendAndConfirmTransaction(connection, tx, [keypair]);
                        console.log('Transaction replicated successfully with signature:', txSignature);
                    } catch (error) {
                        console.error('Failed to replicate transaction:', error);
                    }
                }
            } else {
                console.error('Instruction keys are not in the expected format.');
            }
        } else {
            console.log('Non-system transaction detected or invalid programId, skipping replication.');
        }
    }
}


async function main() {
    console.log('Starting monitor...');
    await monitorAndReplicateTrades();
}

module.exports = { main };

if (require.main === module) {
    main().catch(err => {
        console.error('Unexpected error:', err);
    });
}