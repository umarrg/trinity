const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
require('dotenv').config();
const { Connection } = require('@solana/web3.js');
const cors = require("cors");
const { generateWallet, importWallet } = require('./config');
const { getUserById, addNewUser } = require('./dao/user');
const { addNewWallet, getWalletbyUser } = require('./dao/wallet');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true, }));
app.use(cors());
require("./connections/connection.mongo")();
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const bot = new TelegramBot("7012596625:AAGdR9pfRzL_mosrwtR_HryIYzRRJlt1WMw", { polling: true });
const PORT = process.env.PORT || 4000;

const commands = [
    { command: '/start', description: 'Open Control Panel' },
    { command: '/wallet', description: 'Reveal your connected wallet' },
    { command: '/sell', description: 'Sell token' },
    { command: '/buy', description: 'Buy token' },
    { command: '/positions', description: 'View current positions' },
    { command: '/copytrade', description: 'Enable copy trading' },
    { command: '/withdraw', description: 'Withdraw funds' },
    { command: '/refresh', description: 'Refresh data' },
    { command: '/autosell', description: 'Enable auto sell feature' }
];

bot.setMyCommands(commands);

bot.onText(/\/start/, async (msg, match) => {
    let text = "White Rabbit"
    await bot.sendMessage(msg.chat.id, text, {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'Generate Wallet', callback_data: 'generate_wallet' },
                    { text: 'Import Wallet', callback_data: 'connect_wallet' }
                ],
                [{ text: 'Buy', callback_data: 'buy' }, { text: 'Sell', callback_data: 'sell' },

                ],
                [
                    { text: 'Positions', callback_data: 'positions' },
                    { text: 'Copy Trade', callback_data: 'copy_trade' },
                ],
                [
                    { text: 'Withdraw', callback_data: 'withdraw' },
                    { text: 'Auto Sell', callback_data: 'auto_sell' }
                ],

                [
                    { text: 'Refresh', callback_data: 'refresh' },
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

bot.onText(/\/wallets/, async (msg, match) => {
    let chatID = msg.chat.id;
    const user = await getUserById(chatID);
    const wallets = await getWalletbyUser(user._id);
    console.log(wallets);
    let account = wallets[0]?.address;
    const balance = await connection.getBalance(account);
    let content = `
            Balance: ${balance} SOL \nPublic Key: ${wallets[0]?.address}
            `
    bot.sendMessage(chatId, content);

});



bot.on('callback_query', async (callbackQuery) => {

    const message = callbackQuery.message;
    const chatId = message.chat.id;
    const messageId = message.message_id;
    const data = callbackQuery.data;



    if (callbackQuery.data === "copy_trade") {
        let message = `<b>Copy Trade</b> \n \n Copy Trade allows you to copy the buys and sells of any target wallet. \n 🟢 Indicates a copy trade setup is active. \n 🟠 Indicates a copy trade setup is paused. \n \n You do not have any copy trades setup yet. Click on the New button to create one!`;
        bot.sendMessage(chatId, message, {
            parse_mode: 'HTML',
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
    }
    if (callbackQuery.data === "close_b") {
        bot.deleteMessage(chatId, messageId);

    }
    if (callbackQuery.data === "new") {

        const message = `<b>To setup a new Copy Trade:</b> \n - Assign a unique name or “tag” to your target wallet, to make it easier to identify. \n - Enter the target wallet address to copy trade. \n - Enter the percentage of the target's buy amount to copy trade with, or enter a specific SOL amount to always use. \n - Toggle on Copy Sells to copy the sells of the target wallet. \n - Click “Add” to create and activate the Copy Trade. \n \n <b>To manage your Copy Trade:</b> \n - Click the “Active” button to “Pause” the Copy Trade. \n - Delete a Copy Trade by clicking the “Delete” button.`
        bot.sendMessage(chatId, message, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Tag: ', callback_data: 'tag' },
                    ],
                    [
                        { text: 'Target Wallet:  -', callback_data: 'pause' }
                    ],
                    [
                        { text: 'Buy Percentage: 100%', callback_data: 'buy_percentege' },
                        { text: 'Copy Sells: ✅ yes', callback_data: 'copy_sell' }
                    ],
                    [
                        { text: 'Buy Gas: 0.0015 SOL', callback_data: 'buy_gas' },
                        { text: 'Sell Gas: 0.0015 SOL', callback_data: 'sell_gas' }
                    ],
                    [
                        { text: 'Slippage: 15%', callback_data: 'pause' }
                    ],
                    [
                        { text: '➕ Add', callback_data: 'add' }
                    ],
                    [
                        { text: '⬅️ Back', callback_data: 'back' }
                    ],

                ]
            }
        });

    }
    if (callbackQuery.data === 'generate_wallet') {
        const user = await getUserById(chatId);
        let wallet = await generateWallet();
        let res = await addNewWallet({ address: wallet?.publicKey, privateKey: wallet?.secretKey.toString(), user: user._id, name: "sol" });
        let content = `✅ Generated new wallet: \n Chain: SOLANA \n Public Key: <code>${wallet?.publicKey}</code> (tap to copy)\n PK: ${wallet?.secretKey} \n⚠️ Make sure to save this private key using pen and paper only.Do NOT copy - paste it anywhere.You could also import it to your Metamask / Trust Wallet.After you finish saving / importing the wallet credentials, delete this message.The bot will not display this information again.`
        bot.sendMessage(chatId, content, {
            parse_mode: "HTML",
        });
    }

    if (callbackQuery.data === 'connect_wallet') {
        const user = await getUserById(chatId);
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
                let res = await addNewWallet({ address: wallet?.publicKey, privateKey: wallet?.secretKey.toString(), user: user._id, name: "sol" });
                const balance = await connection.getBalance(wallet.publicKey);
                let content = `
            Balance: ${balance} SOL \nPublic Key:  <code>${wallet?.publicKey.toBase58()}</code> (tap to copy)\n`
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
    }
    if (callbackQuery.data === 'buy') {
        let user = await getUserById(chatId);
        const wallets = await getWalletbyUser(user?.id);
        if (wallets?.length > 0) {
            const myObj = {};
            async function getToken() {
                let listenerReply;

                let contentMessage = await bot.sendMessage(chatId, "Enter the token address you want to buy", {
                    "reply_markup": {
                        "force_reply": true
                    }
                });
                listenerReply = (async (replyHandler) => {
                    bot.removeReplyListener(listenerReply);


                    myObj['token'] = replyHandler.text;


                })

                bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerReply);
            }

            getToken();



        } else { bot.sendMessage(chatId, "Generate Or Import Wallet ") }

    }

})

app.listen(PORT, () => {
    console.log('Bot listening on port ' + PORT)
})
