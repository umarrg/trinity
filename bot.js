const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
require('dotenv').config();
const { Connection, Keypair, VersionedTransaction, PublicKey } = require('@solana/web3.js');
const fetch = require('cross-fetch');
const cors = require("cors");
const axios = require("axios");
const { main } = require('./monitor');
const web3 = require('@solana/web3.js');
const { generateWallet, importWallet, getSolBalance, getSolPriceInUSD } = require('./config');
const { getUserById, addNewUser } = require('./dao/user');
const { addNewWallet, getWalletbyUser, getAllUserWallet } = require('./dao/wallet');
const { addNewTransaction, getTransactionByUser } = require('./dao/transaction');
const { addNewTrade, getTradeByUser, updateTradesForUser, updateTradeForUser, deleteTradeForUser } = require('./dao/trade');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true, }));
app.use(cors());
require("./connections/connection.mongo")();
const connection = new Connection(process.env.SOLANA_ENDPOINT, 'confirmed');
const bot = new TelegramBot(process.env.TOKEN, { polling: true });
const PORT = process.env.PORT || 4000;

const commands = [
    { command: '/start', description: 'Open Control Panel' },
    { command: '/wallet', description: 'Reveal your connected wallet' },
    { command: '/sell', description: 'Sell token' },
    { command: '/buy', description: 'Buy token' },
    { command: '/positions', description: 'View current positions' },
    { command: '/copytrade', description: 'Enable copy trading' },
    { command: '/withdraw', description: 'Withdraw funds' },


];

bot.setMyCommands(commands);
main().catch(err => {
    console.error('Unexpected error:', err);
})
bot.onText(/\/start/, async (msg, match) => {
    let text = "Follow the White Rabbit"
    await bot.sendMessage(msg.chat.id, text, {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'Wallet', callback_data: 'wallet' },
                ],
                [
                    { text: 'Generate Wallet', callback_data: 'generate_wallet' },
                    { text: 'Import Wallet', callback_data: 'connect_wallet' }
                ],
                [{ text: 'Buy', callback_data: 'buy' }, { text: 'Sell', callback_data: 'sell' },

                ],
                [
                    { text: 'Copy Trade', callback_data: 'copy_trade' },
                    { text: 'Positions', callback_data: 'positions' },

                ],
                [
                    { text: 'Withdraw', callback_data: 'withdraw' },

                ],
                [
                    { text: 'Close', callback_data: 'close_b' }
                ],

            ]
        }

    });
    let user = await getUserById(msg.chat.id);
    if (!user?._id) {
        await addNewUser({ chatId: msg.chat.id });

    }
});

bot.onText(/\/wallet/, async (msg, match) => {
    let chatID = msg.chat.id;
    const user = await getUserById(chatID);
    const wallets = await getWalletbyUser(user._id);

    if (wallets && wallets.length > 0) {
        let account = wallets[0].address;

        try {
            const solBalance = await getSolBalance(account);
            const solPriceInUSD = await getSolPriceInUSD();
            const balanceInUSD = (solBalance * solPriceInUSD).toFixed(2);

            let content = `<b>Solana</b>\n<code>${account}</code> (Tap to copy)\nBalance: <code>${solBalance.toFixed(4)} SOL ($${balanceInUSD})</code>`;
            bot.sendMessage(chatID, content, { parse_mode: 'HTML' });
        } catch (error) {
            console.error('Error fetching balance:', error);
            bot.sendMessage(chatID, 'Sorry, there was an error fetching your balance. Please try again later.');
        }
    } else {
        bot.sendMessage(chatID, 'No wallets found for this user. Please Genarate OR Import a Wallet');
    }
});
bot.onText(/\/widthraw/, async (msg, match) => {
    let chatID = msg.chat.id;
    const user = await getUserById(chatID);
    const wallets = await getWalletbyUser(user._id);

    if (wallets && wallets.length > 0) {
        let account = wallets[0].address;

        try {
            const solBalance = await getSolBalance(account);

            bot.sendMessage(chatID, content, { parse_mode: 'HTML' });
        } catch (error) {
            console.error('Error fetching balance:', error);
            bot.sendMessage(chatID, 'Sorry, there was an error fetching your balance. Please try again later.');
        }
    } else {
        bot.sendMessage(chatID, 'No wallets found for this user. Please Genarate OR Import a Wallet');
    }
});



const userSetups = {};
let userInput = {
    amount: 1,
    slippage: 15,
    token: "",
    from: "",
};

bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const chatId = message.chat.id;
    const messageId = message.message_id;
    const data = callbackQuery.data;
    let user = await getUserById(chatId);
    if (!userSetups[chatId]) {
        userSetups[chatId] = {
            tag: '',
            targetWallet: '',
            buyPercentage: '100%',
            copySells: '✅ yes',
            buyGas: '0.0015 SOL',
            sellGas: '0.0015 SOL',
            slippage: '15%'
        };
    }
    const copyTradeSetup = userSetups[chatId];
    if (data === "copy_trade") {

        const trades = await getTradeByUser(user._id);
        const tradeContent = trades.map(trade => {
            return `${trade.copy ? '🟢' : '🟠'} ${trade.tag} <a href="https://solscan.io/account/${trade.wallet}">${trade.wallet}</a>`;
        }).join('\n');

        let message = `<b>Copy Trade</b> \n \n Copy Trade allows you to copy the buys and sells of any target wallet. \n 🟢 Indicates a copy trade setup is active. \n 🟠 Indicates a copy trade setup is paused.\n\n${tradeContent || 'You do not have any copy trades setup yet. Click on the New button to create one!'}`;
        bot.sendMessage(chatId, message, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '➕ New', callback_data: 'new' },
                    ],
                    [
                        { text: 'Pause One', callback_data: 'pauseOne' },
                        { text: 'Pause All', callback_data: 'pauseTrade' }
                    ],
                    [
                        { text: '🗑️ Delete One', callback_data: 'deleteOne' },
                    ],
                    [
                        { text: '⬅️ Back', callback_data: 'close_b' }
                    ],
                ]
            }
        });
    } else if (data === "close_b") {
        bot.deleteMessage(chatId, messageId);

    } else if (data === "new") {
        sendCopyTradeSetupMessage(chatId, copyTradeSetup);

    } else if (data === 'tag') {
        bot.sendMessage(chatId, 'Enter a custom name for this copy trade setup:');
        bot.once('message', (msg) => {
            copyTradeSetup.tag = msg.text;
            sendCopyTradeSetupMessage(chatId, copyTradeSetup);
        });
    } else if (data === 'target_wallet') {
        bot.sendMessage(chatId, 'Enter the target wallet address to copy trade:');
        bot.once('message', (msg) => {
            copyTradeSetup.targetWallet = msg.text;
            sendCopyTradeSetupMessage(chatId, copyTradeSetup);
        });
    } else if (data === 'buy_percentage') {
        bot.sendMessage(chatId, 'Enter the percentage of the target\'s buy amount to copy trade with. E.g. with 50%, if the target buys with 1 SOL, you will buy with 0.5 SOL. If you want to buy with a fixed SOL amount instead, enter a number. E.g. 0.1 SOL will buy with 0.1 SOL regardless of the target\'s buy amount.');
        bot.once('message', (msg) => {
            copyTradeSetup.buyPercentage = msg.text;
            sendCopyTradeSetupMessage(chatId, copyTradeSetup);
        });
    } else if (data === 'buy_gas') {
        bot.sendMessage(chatId, 'Enter the priority fee to pay for buy trades. E.g 0.01 for 0.01 SOL:');
        bot.once('message', (msg) => {
            copyTradeSetup.buyGas = msg.text;
            sendCopyTradeSetupMessage(chatId, copyTradeSetup);
        });
    } else if (data === 'sell_gas') {
        bot.sendMessage(chatId, 'Enter the priority fee to pay for sell trades. E.g 0.01 for 0.01 SOL:');
        bot.once('message', (msg) => {
            copyTradeSetup.sellGas = msg.text;
            sendCopyTradeSetupMessage(chatId, copyTradeSetup);
        });
    } else if (data === 'slippage') {
        bot.sendMessage(chatId, 'Enter slippage % to use on copy trades:');
        bot.once('message', (msg) => {
            copyTradeSetup.slippage = msg.text;
            sendCopyTradeSetupMessage(chatId, copyTradeSetup);
        });
    } else if (data === 'copy_sell') {
        copyTradeSetup.copySells = copyTradeSetup.copySells === '✅ yes' ? '❌ no' : '✅ yes';
        sendCopyTradeSetupMessage(chatId, copyTradeSetup);
    } else if (data === 'back') {
        let text = "Follow The White Bot"
            ; const options = {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Wallet', callback_data: 'wallet' },
                        ],
                        [
                            { text: 'Generate Wallet', callback_data: 'generate_wallet' },
                            { text: 'Import Wallet', callback_data: 'connect_wallet' }
                        ],
                        [{ text: 'Buy', callback_data: 'buy' }, { text: 'Sell', callback_data: 'sell' },

                        ],
                        [
                            { text: 'Copy Trade', callback_data: 'copy_trade' },
                            { text: 'Positions', callback_data: 'positions' },

                        ],
                        [
                            { text: 'Withdraw', callback_data: 'withdraw' },

                        ],
                        [
                            { text: 'Close', callback_data: 'close_b' }
                        ],

                    ]
                }
            };

        bot.editMessageText('Follow The White Bot', options);

    } else if (data === 'withdraw') {
        let user = await getUserById(chatId);
        const wallets = await getWalletbyUser(user?._id);

        if (wallets?.length > 0) {
            const myObj = {};

            async function getToken() {
                const contentMessage = await bot.sendMessage(chatId, "Enter the wallet address", {
                    "reply_markup": {
                        "force_reply": true
                    }
                });

                bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, async (replyHandler) => {
                    myObj['address'] = replyHandler.text;

                    try {
                        new web3.PublicKey(myObj['address']);
                        await getAmount();
                    } catch (error) {
                        bot.sendMessage(chatId, 'Invalid address. Please check the address and try again.');
                    }



                });
            }

            async function getAmount() {
                const contentMessage = await bot.sendMessage(chatId, 'How much do you want to withdraw?', {
                    "reply_markup": {
                        "force_reply": true
                    }
                });

                bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, async (replyHandler) => {
                    myObj['amount'] = parseFloat(replyHandler.text);

                    if (isNaN(myObj['amount']) || myObj['amount'] <= 0) {
                        bot.sendMessage(chatId, 'Invalid amount. Please enter a positive number.');
                        return;
                    }

                    const solBalance = await getSolBalance(wallets[0].address);

                    if (myObj['amount'] > solBalance) {
                        bot.sendMessage(chatId, `Insufficient balance. Your current balance is ${solBalance} SOL.`);
                        return;
                    }

                    await processTransaction();
                });
            }

            async function processTransaction() {
                const fromAccount = wallets[0];
                const lamports = myObj['amount'] * web3.LAMPORTS_PER_SOL;

                const transaction = new web3.Transaction().add(
                    web3.SystemProgram.transfer({
                        fromPubkey: new web3.PublicKey(fromAccount.address),
                        toPubkey: new web3.PublicKey(myObj['address']),
                        lamports: lamports,
                    })
                );
                const secretKeyUint8 = Uint8Array.from(fromAccount.privateKey.split(',').map(Number));
                const fromKeypair = Keypair.fromSecretKey(secretKeyUint8);

                try {
                    const signature = await web3.sendAndConfirmTransaction(connection, transaction, [fromKeypair]);
                    const transactionUrl = `https://solscan.io/tx/${signature}`;
                    bot.sendMessage(chatId, `Transaction successful! <a href="${transactionUrl}">view transaction</a>`, { parse_mode: 'HTML' });
                } catch (error) {
                    console.error('Transaction error:', error);
                    bot.sendMessage(chatId, 'Sorry, there was an error processing your transaction. Please try again later.');
                }
            }

            await getToken();
        } else {
            bot.sendMessage(chatId, 'No wallets found for this user. Please generate or import a wallet.');
        }
    }

    else if (data === 'add') {



    } else if (data === 'pauseOne') {
        let listenerReply;
        let contentMessage = await bot.sendMessage(chatId, "Enter the wallet Address", {
            "reply_markup": {
                "force_reply": true
            }
        });
        listenerReply = (async (replyHandler) => {
            bot.removeReplyListener(listenerReply);

            await updateTradeForUser(user._id, replyHandler.text)
            await bot.sendMessage(chatId, "Trade Paused successfully")
        });
        bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerReply);
    } else if (data === 'deleteOne') {
        let listenerReply;
        let contentMessage = await bot.sendMessage(chatId, "Enter the wallet Address", {
            "reply_markup": {
                "force_reply": true
            }
        });
        listenerReply = (async (replyHandler) => {
            bot.removeReplyListener(listenerReply);
            await deleteTradeForUser(user._id, replyHandler.text)
            await bot.sendMessage(chatId, "Trade Dellete successfully")
        });
        bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerReply);
    }

    else if (data === 'pauseTrade') {
        updateTradesForUser(user._id)
    }
    else if (data === 'sell') {
        await handleSellCommand(chatId, data);
    } else if (data.startsWith('transaction_')) {
        await handleInlineButtonClick(chatId, data);
    }
    else if (callbackQuery.data === 'generate_wallet') {
        const user = await getUserById(chatId);
        const wallets = await getWalletbyUser(user._id);
        if (wallets && wallets.length < 1) {
            let wallet = await generateWallet();
            let res = await addNewWallet({ address: wallet?.publicKey.toString(), privateKey: wallet?.secretKey.toString(), user: user._id, name: "sol" });
            let content = `✅ Generated new wallet: \n Chain: SOLANA \n Public Key: <code>${wallet?.publicKey.toString()}</code> (tap to copy)\n PK: ${wallet?.secretKey} \n⚠️ Make sure to save this private key using pen and paper only.Do NOT copy - paste it anywhere.You could also import it to your Metamask / Trust Wallet.After you finish saving / importing the wallet credentials, delete this message.The bot will not display this information again.`
            bot.sendMessage(chatId, content, {
                parse_mode: "HTML",
            });

        } else {
            bot.sendMessage(chatId, 'View Wallet', {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Wallet', callback_data: 'wallet' },
                        ],
                    ],
                }
            });
        }

    } else if (callbackQuery.data === 'connect_wallet') {
        const user = await getUserById(chatId);
        const wallets = await getWalletbyUser(user._id);
        if (wallets && wallets.length < 1) {
            let listenerReply;
            let contentMessage = await bot.sendMessage(chatId, "What's the private key of this wallet?", {
                "reply_markup": {
                    "force_reply": true
                }
            });
            listenerReply = (async (replyHandler) => {
                bot.removeReplyListener(listenerReply);
                try {

                    let wallet = await importWallet(replyHandler.text);
                    let res = await addNewWallet({ address: wallet?.publicKey.toString(), privateKey: wallet?.secretKey.toString(), user: user._id, name: "sol" });
                    const balance = await connection.getBalance(wallet.publicKey);
                    let content = `
            Balance: ${balance} SOL \nPublic Key:  <code>${wallet?.publicKey.toString()()}</code> (tap to copy)\n`
                    await bot.sendMessage(replyHandler.chat.id, content, {
                        "parse_mode": "HTML",
                        "reply_markup": {
                            "force_reply": false,

                        }
                    });
                } catch (error) {
                    console.error("Error:", error);
                    await bot.sendMessage(replyHandler.chat.id, "Invalid private key format. Please try again.");
                }
            });
            bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerReply);
        } else {
            bot.sendMessage(chatId, 'View Wallet', {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Wallet', callback_data: 'wallet' },
                        ],
                    ],
                }
            });
        }

    } else if (data === 'buy') {
        let user = await getUserById(chatId);
        const wallets = await getWalletbyUser(user?.id);
        if (wallets?.length > 0) {
            const myObj = {};
            async function getToken() {
                let listenerReply;

                let contentMessage = await bot.sendMessage(chatId, "Enter a token symbol or address to buy", {
                    "reply_markup": {
                        "force_reply": true
                    }
                });
                listenerReply = async (replyHandler) => {
                    bot.removeReplyListener(listenerReply);
                    userInput.token = replyHandler.text;
                    myObj['token'] = replyHandler.text;

                    const tokenData = await getTokenData(myObj['token']);
                    if (tokenData) {
                        const coinGeckoId = tokenData.extensions?.coingeckoId;
                        if (coinGeckoId) {
                            const coinGeckoData = await getCoinGeckoData(coinGeckoId);
                            if (coinGeckoData) {
                                const { price, marketCap, priceChange24h, liquidity } = coinGeckoData;
                                const wallets = await getWalletbyUser(user._id);
                                let account = wallets[0].address;

                                const solBalance = await getSolBalance(account);
                                const solPriceInUSD = await getSolPriceInUSD();
                                const balanceInUSD = (solBalance * solPriceInUSD).toFixed(2);

                                bot.sendMessage(chatId,
                                    `<b>Wallet</b>\n<code>${account}</code> (Tap to copy)\nBalance: <code>${solBalance.toFixed(4)} SOL ($${balanceInUSD})</code> \nThe current price of ${tokenData.name} (${tokenData.symbol}) is $${price}\n` +
                                    `Market Cap: $${marketCap}\n` +
                                    `24h Price Change: ${priceChange24h}%\n` +
                                    `Liquidity Score: ${liquidity}`,

                                    {
                                        "parse_mode": "HTML",
                                        reply_markup: {
                                            inline_keyboard: [
                                                [
                                                    { text: '⬅️ Back', callback_data: 'back' },
                                                    { text: '🔄 Refresh', callback_data: 'refresh' },
                                                ],
                                                [
                                                    { text: '0.5 SOL', callback_data: 'amount_0.5' },
                                                    { text: '✅ 1 SOL', callback_data: 'amount_1' },
                                                    { text: '3 SOL', callback_data: 'amount_3' },
                                                ],
                                                [
                                                    { text: '5 SOL', callback_data: 'amount_5' },
                                                    { text: '10 SOL', callback_data: 'amount_10' },
                                                    { text: 'X SOL', callback_data: 'amount_custom' },
                                                ],
                                                [
                                                    { text: '✅ 15% Slippage', callback_data: 'slippage_15' },
                                                    { text: 'X Slippage', callback_data: 'slippage_custom' },
                                                ],
                                                [
                                                    { text: 'Buy', callback_data: 'confirm_buy' },
                                                ],
                                            ],
                                        }
                                    }
                                );
                            } else {
                                bot.sendMessage(chatId, `Could not fetch the price for ${tokenData.name} (${tokenData.symbol}).`);
                            }
                        } else {
                            bot.sendMessage(chatId, `No CoinGecko ID found for ${tokenData.name} (${tokenData.symbol}).`);
                        }
                    } else {
                        bot.sendMessage(chatId, `Token not found.`);
                    }
                };

                bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerReply);
            }

            getToken();
        } else {
            bot.sendMessage(chatId, "Generate Or Import Wallet");
        }
    } else if (data.startsWith('amount_')) {
        const amount = data.split('_')[1];
        if (amount === 'custom') {
            let contentMessage = await bot.sendMessage(chatId, "Enter the amount of SOL you want to buy", {
                "reply_markup": {
                    "force_reply": true
                }
            });
            bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, (replyHandler) => {
                userInput.amount = parseFloat(replyHandler.text);
                bot.sendMessage(chatId, `✅ Custom amount set to ${userInput.amount} SOL`);
            });
        } else {
            userInput.amount = parseFloat(amount);
            bot.sendMessage(chatId, `✅ Amount set to ${userInput.amount} SOL`);
        }
    } else if (data.startsWith('slippage_')) {
        const slippage = data.split('_')[1];
        if (slippage === 'custom') {
            let contentMessage = await bot.sendMessage(chatId, "Enter the slippage percentage you want to set", {
                "reply_markup": {
                    "force_reply": true
                }
            });
            bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, (replyHandler) => {
                userInput.slippage = parseFloat(replyHandler.text);
                bot.sendMessage(chatId, `✅ Custom slippage set to ${userInput.slippage}%`);
            });
        } else {
            userInput.slippage = parseFloat(slippage);
            bot.sendMessage(chatId, `✅ Slippage set to ${userInput.slippage}%`);
        }
    } else if (data === 'confirm_buy') {
        if (!userInput.token || !userInput.amount || !userInput.slippage) {
            bot.sendMessage(chatId, "Please ensure you have selected a token, amount, and slippage.");
            return;
        }

        const tokenData = await getTokenData(userInput.token);
        const wallets = await getWalletbyUser(user._id);
        let account = wallets[0].privateKey;
        const secretKeyUint8 = Uint8Array.from(account.split(',').map(Number));
        const wallet = Keypair.fromSecretKey(secretKeyUint8);
        const inputMint = 'So11111111111111111111111111111111111111112';
        const outputMint = tokenData.address;
        const amount = Math.round(userInput.amount * 1e9);
        const slippageBps = userInput.slippage * 100;


        try {

            const quoteResponse = await (await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`)).json();

            const { swapTransaction } = await (await fetch('https://quote-api.jup.ag/v6/swap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    quoteResponse,
                    userPublicKey: wallet.publicKey.toString(),
                    wrapAndUnwrapSol: true
                })
            })).json();
            const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');

            const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

            transaction.sign([wallet]);

            const rawTransaction = transaction.serialize();
            const txid = await connection.sendRawTransaction(rawTransaction, {
                skipPreflight: true,
                maxRetries: 2
            });
            await connection.confirmTransaction(txid);
            bot.sendMessage(chatId, `Traansaction successfully! Transaction ID: https://solscan.io/tx/${txid}`);
            await addNewTransaction({ fromAsset: inputMint, toAsset: outputMint, amount: amount, user: user._id, status: "success", type: "buy", from: "sol", to: tokenData?.symbol })
        } catch (error) {
            bot.sendMessage(chatId, `Transaction Failed ${error}`);

        }
    } else if (data === "wallet") {
        const user = await getUserById(chatId);
        const wallets = await getWalletbyUser(user._id);
        if (wallets && wallets.length > 0) {
            let account = wallets[0].address;

            try {
                const solBalance = await getSolBalance(account);
                const solPriceInUSD = await getSolPriceInUSD();
                const balanceInUSD = (solBalance * solPriceInUSD).toFixed(2);

                let content = `<b>Solana</b>\n<code>${account}</code> (Tap to copy)\nBalance: <code>${solBalance.toFixed(4)} SOL ($${balanceInUSD})</code>`;
                bot.sendMessage(chatId, content, { parse_mode: 'HTML' });
            } catch (error) {
                console.error('Error fetching balance:', error);
                bot.sendMessage(chatId, 'Sorry, there was an error fetching your balance. Please try again later.');
            }
        } else {
            bot.sendMessage(chatId, 'No wallets found for this user. Please Genarate OR Import a Wallet');
        }

    } else if (data === 'buy_no') {
        await bot.sendMessage(chatId, `Purchase cancelled.`);
    } else if (data === "confirm_trade") {
        await addNewTrade({ wallet: copyTradeSetup.targetWallet, tag: copyTradeSetup.tag, user: user._id, copy: true });
        const trades = await getTradeByUser(user._id);
        const tradeContent = trades.map(trade => {
            return `${trade.copy ? '🟢' : '🟠'} ${trade.tag} <a href="https://solscan.io/account/${trade.wallet}">_${trade.wallet}</a>`;
        }).join('\n');

        let message = `<b>Copy Trade</b> \n \n Copy Trade allows you to copy the buys and sells of any target wallet. \n 🟢 Indicates a copy trade setup is active. \n 🟠 Indicates a copy trade setup is paused.\n\n${tradeContent || 'You do not have any copy trades setup yet. Click on the New button to create one!'}`;
        bot.sendMessage(chatId, message, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '➕ New', callback_data: 'new' },
                    ],
                    [
                        { text: 'Pause All', callback_data: 'pause' }
                    ],
                    [
                        { text: '⬅️ Back', callback_data: 'close_b' }
                    ],
                ]
            }
        });

    } else if (data === "positions") {
        bot.sendMessage(chatId, "You do not have any tokens yet! Start trading in the Buy menu.", {

            reply_markup: {
                inline_keyboard: [

                    [
                        { text: 'Close', callback_data: 'close_b' }
                    ],

                ]
            }

        })
    } else if (data === 'confirm_sell') {

        if (!userInput.token || !userInput.amount || !userInput.slippage) {
            bot.sendMessage(chatId, "Please ensure you have selected a token, amount, and slippage.");
            return;
        }

        const tokenData = await getTokenData(userInput.token);
        const wallets = await getWalletbyUser(user._id);
        let account = wallets[0].privateKey;
        const secretKeyUint8 = Uint8Array.from(account.split(',').map(Number));
        const wallet = Keypair.fromSecretKey(secretKeyUint8);
        const inputMint = tokenData.address;
        const outputMint = 'So11111111111111111111111111111111111111112';
        const amount = Math.round(userInput.amount * 1e9);
        const slippageBps = userInput.slippage * 100;

        try {
            const quoteResponse = await (await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`)).json();
            console.log("dddd", quoteResponse);
            const { swapTransaction } = await (await fetch('https://quote-api.jup.ag/v6/swap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    quoteResponse,
                    userPublicKey: wallet.publicKey.toString(),
                    wrapAndUnwrapSol: true
                })
            })).json();

            const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
            const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

            transaction.sign([wallet]);

            const rawTransaction = transaction.serialize();
            const txid = await connection.sendRawTransaction(rawTransaction, {
                skipPreflight: true,
                maxRetries: 2
            });
            await connection.confirmTransaction(txid);

            bot.sendMessage(chatId, `Transaction successful! Transaction ID: https://solscan.io/tx/${txid}`);
            await addNewTransaction({ fromAsset: inputMint, toAsset: outputMint, amount: amount, user: user._id, status: "success", type: "sell", from: "sol", to: tokenData?.symbol });
        } catch (error) {
            bot.sendMessage(chatId, `Transaction Failed: ${error}`);
        }
    }


});
async function handleSellCommand(chatId, data) {
    const user = await getUserById(chatId);
    const wallets = await getWalletbyUser(user._id);
    try {
        const transactions = await getTransactionByUser(user._id);
        const inlineKeyboard = transactions.map(transaction => {
            return [{ text: transaction.to, callback_data: `transaction_${transaction.to}` }];
        });

        inlineKeyboard.push([
            { text: '⬅️ Back', callback_data: 'back' },
            { text: '🔄 Refresh', callback_data: 'refresh' }
        ]);

        let account = wallets[0].address;

        const solBalance = await getSolBalance(account);
        const solPriceInUSD = await getSolPriceInUSD();
        const balanceInUSD = (solBalance * solPriceInUSD).toFixed(2);

        let content = `<b>Solana</b>\nBalance: <code>${solBalance.toFixed(4)} SOL ($${balanceInUSD})</code>\n \nSelect Token to Sell \n \n`;

        for (const tx of transactions) {
            const tokenPriceInUSD = await getTokenPriceInUSD(tx.toAsset);
            content += `<code>${tx.to}</code> ($${tokenPriceInUSD} USD)\n`;
        }

        bot.sendMessage(chatId, content, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: inlineKeyboard
            }
        });
    } catch (error) {
        console.error('Error fetching transaction data:', error);
    }
}

async function handleInlineButtonClick(chatId, data) {
    const user = await getUserById(chatId);

    if (data.startsWith('transaction_')) {
        const tokenMint = data.split('_')[1];
        userInput.token = tokenMint;

        const tokenData = await getTokenData(tokenMint);
        const coinGeckoId = tokenData.extensions?.coingeckoId;

        if (coinGeckoId) {
            const coinGeckoData = await getCoinGeckoData(coinGeckoId);

            if (coinGeckoData) {
                const { price, marketCap, priceChange24h, liquidity } = coinGeckoData;
                const wallets = await getWalletbyUser(user._id);
                let account = wallets[0].address;
                let symbol = tokenData.symbol;
                const solBalance = await getSolBalance(account);
                const solPriceInUSD = await getSolPriceInUSD();
                const balanceInUSD = (solBalance * solPriceInUSD).toFixed(2);

                bot.sendMessage(chatId,
                    `<b>Wallet</b>\n<code>${account}</code> (Tap to copy)\nBalance: <code>${solBalance.toFixed(4)} SOL ($${balanceInUSD})</code> \nThe current price of ${tokenData.name} (${tokenData.symbol}) is $${price}\n` +
                    `Market Cap: $${marketCap}\n` +
                    `24h Price Change: ${priceChange24h}%\n` +
                    `Liquidity Score: ${liquidity}`,

                    {
                        parse_mode: "HTML",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '⬅️ Back', callback_data: 'back' },
                                    { text: '🔄 Refresh', callback_data: 'refresh' },
                                ],
                                [
                                    { text: `0.5 ${symbol}`, callback_data: 'amount_0.5' },
                                    { text: `✅ 1 ${symbol}`, callback_data: 'amount_1' },
                                    { text: `3 ${symbol}`, callback_data: 'amount_3' },
                                ],
                                [
                                    { text: `5 ${symbol}`, callback_data: 'amount_5' },
                                    { text: `10 ${symbol}`, callback_data: 'amount_10' },
                                    { text: `X ${symbol}`, callback_data: 'amount_custom' },
                                ],
                                [
                                    { text: '✅ 15% Slippage', callback_data: 'slippage_15' },
                                    { text: 'X Slippage', callback_data: 'slippage_custom' },
                                ],
                                [
                                    { text: 'Sell', callback_data: 'confirm_sell' },
                                ],
                            ],
                        }
                    }
                );
            } else {
                bot.sendMessage(chatId, `Could not fetch the price for ${tokenData.name} (${tokenData.symbol}).`);
            }
        } else {
            bot.sendMessage(chatId, `No CoinGecko ID found for ${tokenData.name} (${tokenData.symbol}).`);
        }
    } else if (data.startsWith('amount_')) {
        const amount = data.split('_')[1];
        if (amount === 'custom') {
            let contentMessage = await bot.sendMessage(chatId, "Enter the amount of SOL you want to sell", {
                reply_markup: {
                    force_reply: true
                }
            });
            bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, (replyHandler) => {
                userInput.amount = parseFloat(replyHandler.text);
                bot.sendMessage(chatId, `✅ Custom amount set to ${userInput.amount} SOL`);
            });
        } else {
            userInput.amount = parseFloat(amount);
            bot.sendMessage(chatId, `✅ Amount set to ${userInput.amount} SOL`);
        }
    } else if (data.startsWith('slippage_')) {
        const slippage = data.split('_')[1];
        if (slippage === 'custom') {
            let contentMessage = await bot.sendMessage(chatId, "Enter the slippage percentage you want to set", {
                reply_markup: {
                    force_reply: true
                }
            });
            bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, (replyHandler) => {
                userInput.slippage = parseFloat(replyHandler.text);
                bot.sendMessage(chatId, `✅ Custom slippage set to ${userInput.slippage}%`);
            });
        } else {
            userInput.slippage = parseFloat(slippage);
            bot.sendMessage(chatId, `✅ Slippage set to ${userInput.slippage}%`);
        }
    }
}
function sendCopyTradeSetupMessage(chatId, setup) {
    const message = `<b>To setup a new Copy Trade:</b> \n - Assign a unique name or “tag” to your target wallet, to make it easier to identify. \n - Enter the target wallet address to copy trade. \n - Enter the percentage of the target's buy amount to copy trade with, or enter a specific SOL amount to always use. \n - Toggle on Copy Sells to copy the sells of the target wallet. \n - Click “Add” to create and activate the Copy Trade. \n \n <b>To manage your Copy Trade:</b> \n - Click the “Active” button to “Pause” the Copy Trade. \n - Delete a Copy Trade by clicking the “Delete” button.`;
    bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'Tag: ' + setup.tag, callback_data: 'tag' },
                ],
                [
                    { text: 'Target Wallet: ' + setup.targetWallet, callback_data: 'target_wallet' }
                ],
                [
                    { text: 'Buy Percentage: ' + setup.buyPercentage, callback_data: 'buy_percentage' },
                    { text: 'Copy Sells: ' + setup.copySells, callback_data: 'copy_sell' }
                ],
                [
                    { text: 'Buy Gas: ' + setup.buyGas, callback_data: 'buy_gas' },
                    { text: 'Sell Gas: ' + setup.sellGas, callback_data: 'sell_gas' }
                ],
                [
                    { text: 'Slippage: ' + setup.slippage, callback_data: 'slippage' }
                ],
                [
                    { text: '➕ Add', callback_data: 'confirm_trade' }
                ],
                [
                    { text: '⬅️ Back', callback_data: 'back' }
                ],
            ]
        }
    });
}


async function getTokenPriceInUSD(tokenAddress) {
    const API_KEY = process.env.COINGECKO_KEY;;
    const BASE_URL = 'https://pro-api.coingecko.com/api/v3';

    try {
        const response = await axios.get(`${BASE_URL}/simple/token_price/solana`, {
            headers: {
                'X-CG-Pro-API-Key': API_KEY
            },
            params: {
                contract_addresses: tokenAddress,
                vs_currencies: 'usd'
            }
        });
        return response.data[tokenAddress]?.usd || 0;
    } catch (error) {
        console.error('Error fetching token price from CoinGecko:', error);
        return 0;
    }
}
async function getTokenData(token) {
    try {
        const capitalizedToken = token.toUpperCase();
        const response = await axios.get('https://token.jup.ag/strict');
        const tokens = response.data;
        const tokenData = tokens.find(t => t.symbol === capitalizedToken || t.address === capitalizedToken);
        return tokenData;
    } catch (error) {
        console.error('Error fetching token data:', error);
        return null;
    }
}

async function getCoinGeckoData(coinGeckoId) {
    const API_KEY = process.env.COINGECKO_KEY;
    const BASE_URL = 'https://pro-api.coingecko.com/api/v3';

    try {
        const response = await axios.get(`${BASE_URL}/coins/${coinGeckoId}`, {
            headers: {
                'X-CG-Pro-API-Key': API_KEY
            }
        });
        const data = response.data;
        return {
            price: data.market_data.current_price.usd,
            marketCap: data.market_data.market_cap.usd,
            priceChange24h: data.market_data.price_change_percentage_24h,
            liquidity: data.liquidity_score
        };
    } catch (error) {
        console.error('Error fetching CoinGecko data:', error);
        return null;
    }
}

app.listen(PORT, () => {
    console.log('Bot listening on port ' + PORT)
})
