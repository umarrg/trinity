const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
require('dotenv').config();
const cors = require("cors");
const { ethers } = require('ethers');
const { generateWallet, importWallet, getBalance, snipe, getTokenInfo, buyManually, getArr, buyTokenOnListing, buyTokens, getBscBalance } = require('./blockchain');
const { addNewWallet, getWalletbyId, getWalletbyUser, deleteOneWallet } = require('./dao/wallet');
const { addNewUser, getUserById, updateUser, } = require('./dao/user');
const QRCode = require('qrcode');
const { generateQr } = require('./config');
const { addNewTransaction, getTransactionUser } = require('./dao/transaction');
const { snipeToken, swapUniswap, swap } = require('./uniswap');
const { snipeTokenOnPancakeSwap } = require('./pankageswap');
const { buyPancakeswap, swapTokens } = require('./test');
require("./connections/connection.mongo")();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true, }));
app.use(cors());
// const bot = new TelegramBot("6680045927:AAE7PjTSgYycaVdXDmC22YS1BwWsaL4iPfk", { polling: true });
const bot = new TelegramBot("6164785282:AAHGRrkPyXoi3TCx7jokqZKA-LSbl7366ck", { polling: true });

const PORT = process.env.PORT || 4000;

const commands = [

    { command: '/start', description: 'Open Control Pannel' },
    { command: '/gwei', description: 'Return the current base fee for execution operation' },
    { command: '/wallets', description: 'reveal all your connected wallets' },

];
bot.setMyCommands(commands);

bot.onText(/\/start/, async (msg, match) => {
    let text = "TRINITY SOLANA SNIPER BOT  \r\n \r\n Your ultimate ally in the Solana ecosystem: Amplify your profits with TRINITY. Execute trades with unparalleled speed, pinpoint opportunities before they arise, and track your gains in real-time. 🌟 "


    await bot.sendMessage(msg.chat.id, text, {

        reply_markup: {
            inline_keyboard: [
                [{ text: 'Auto Sniper', callback_data: 'auto_sniper' }],
                [{ text: '✨ Manual Buyer', callback_data: 'manual_snipe' }],
                [{ text: '🔫 My Pending Snipes', callback_data: 'pending_txn' }],
                [
                    { text: 'Import Wallet', callback_data: 'connect_eth' }
                ],
                [
                    { text: 'Generate Wallet', callback_data: 'generate_eth' }
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

let buttonStates = {
    first_bundle_fail: '🔴',
    max_tx_revert: '🔴',
    min_disabled: '🔴',
    anti_rug: '🔴',
    transfer_on_bla: '🔴'
};


function sendButtonMessage(data, chatId) {
    let opt = {
        reply_markup: {
            inline_keyboard: [
                [{ text: `${buttonStates.first_bundle_fail} First Bundle or Fail`, callback_data: 'first_bundle_fail' }],
                [{ text: '✨ Slippage: Unlimited', callback_data: 'slippage_unlimited' }],
                [{ text: `${buttonStates.max_tx_revert} MaxTx or Revert`, callback_data: 'max_tx_revert' }, { text: `${buttonStates.min_disabled} Min: Disabled`, callback_data: 'min_disabled' }],
                [{ text: `${buttonStates.anti_rug} Anti-Rug`, callback_data: 'anti_rug' }, { text: `${buttonStates.transfer_on_bla} Transfer on Bla...`, callback_data: 'transfer_on_bla' }],
                [{ text: '✔️ Pre Approve', callback_data: 'pre_approve' }, { text: '⚙️ Snipe Settings', callback_data: 'snipe_setting' }],
                [{ text: 'Cancel', callback_data: 'close_b' }],
            ],
        },
    }

    bot.sendMessage(chatId, data, opt);
}



async function sniper(chatID) {
    let txt = `✅ You have been authorized!` + `\r\n` + `\r\n` +
        `Video Tutorial | GitBook` + `\r\n` + `\r\n` +
        `To be able to use this bot you must join this channel, & remain a member: @OptixToken
` + `\r\n` + `\r\n` +
        `This bot is free to access with a 1% fee on every buy, & sell. The fee’s generated will be airdropped to all Optix token holders. 
` + `\r\n` + `\r\n` +
        `While using this bot, you have confirmed that you’ve read & agreed to the terms of service.`;
    await bot.sendMessage(chatID, txt, {
        parse_mode: "HTML",
    });
    let analytics = "What would you like to do today ? " + "\r\n" + "\r\n" +
        "Monitor" + "\r\n" +
        "Active Trades: 0" + "\r\n" +
        "Disabled Trades: 0" + "\r\n" + "\r\n" +
        "God Mode" + "\r\n" +
        "Active God Modes: 0" + "\r\n" + "\r\n" +
        "Presale" + "\r\n" +
        "Active Presales: 0";

    await bot.sendMessage(chatID, analytics, {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'Optix Sniper Bot', callback_data: 'r1b1' },
                ],
                [
                    { text: '⚙️Wallets', callback_data: 'wallet_button' },
                    { text: '⚙️Call Channels', callback_data: 'callChannel_button' }
                ],
                [
                    { text: '⚙️Presale', callback_data: 'presale_button' },
                    { text: '⚙️Copytrade', callback_data: 'copyTrade_button' },

                ],
                [
                    { text: '⚙️God Mode', callback_data: 'godMode_button' },
                ],
                [
                    { text: '⭐️Premium⭐️', callback_data: 'premium_button' },
                    { text: 'ℹ️FAQ', callback_data: 'faq_button' }
                ],
            ]
        }
    });

}
async function bscMenu(chatId, messageId) {
    const opts = {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Optix Sniper bot', callback_data: 'exdux_3' }],
                [{ text: 'Connect Wallet', callback_data: 'connect_bsc' }, { text: 'Return', callback_data: 'return_menu' },],
                [
                    { text: 'Generate Wallet', callback_data: 'generate_bsc' }
                ]
            ]
        }
    };

    let user = await getUserById(chatId);
    let wallet = await getWalletbyUser(user?.id);
    console.log("ss", wallet)
    let address = wallet?.address;
    console.log("ss", wallet);
    console.log("add", address);
    const balance = await getBalance(address);
    console.log("balance", balance);


    const content = `
Address: ${address}
balance: ${balance}
Chain: BSC

📍 General
Anti-Rug: ❌
Semi-Private TX: ❌
Smart Slippage: ❌
Multi Wallet: ❌
Max Gas Price: Default (300 gwei)
Slippage: Default (10%)
Max Gas Limit: Auto (3,000,000)
Degen Mode: ❌

📌 Buy
Auto Buy: ❌
Duplicate Buy: ❌
Buy Gas Price: Default (1.1 gwei)
Max MCap: Disabled
Min Liquidity: Disabled
Max Liquidity: Disabled
Min MCap/Liq: Disabled
Max Buy Tax: Disabled
Max Sell Tax: Disabled

📌 Sell
Auto Sell: ❌
Trailing Sell: ❌
Trade Sell Confirmation: ❌
Sell Gas Price: Default (1.1 gwei)
Auto Sell (high): Default (+100%)
Sell Amount (high): Default (100%)
Auto Sell (low): Default (-101%)
Sell Amount (low): Default (100%)

📌 Approve
Auto Approve: ✅
Approve Gas Price: Default (1.1 gwei)

🏦 Optix Fees
Unpaid: 0 BNB

ℹ️ Smart Slippage is unsuitable for stealth launches and God Mode snipes.
    `;
    let text = "No setting Selected";
    if (wallet != null && wallet?.user) {
        await bot.editMessageText(content, opts);
    } else {
        await bot.editMessageText(text, opts);
    }
}

async function ethMenu(chatId, messageId) {
    const opts = {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Optix Sniper bot', callback_data: 'exdux_3' }],
                [{ text: 'Connect Wallet', callback_data: 'connect_eth' }, { text: 'Return', callback_data: 'return_menu' },],
                [
                    { text: 'Generate Wallet', callback_data: 'generate_eth' }
                ]
            ]
        }
    };

    const content = `
Address: Disconnected
Chain: ETH

📍 General
Anti-Rug: ❌
Semi-Private TX: ❌
Smart Slippage: ❌
Multi Wallet: ❌
Max Gas Price: Default (300 gwei)
Slippage: Default (10%)
Max Gas Limit: Auto (3,000,000)
Degen Mode: ❌

📌 Buy
Auto Buy: ❌
Duplicate Buy: ❌
Buy Gas Price: Default (1.1 gwei)
Max MCap: Disabled
Min Liquidity: Disabled
Max Liquidity: Disabled
Min MCap/Liq: Disabled
Max Buy Tax: Disabled
Max Sell Tax: Disabled

📌 Sell
Auto Sell: ❌
Trailing Sell: ❌
Trade Sell Confirmation: ❌
Sell Gas Price: Default (1.1 gwei)
Auto Sell (high): Default (+100%)
Sell Amount (high): Default (100%)
Auto Sell (low): Default (-101%)
Sell Amount (low): Default (100%)

📌 Approve
Auto Approve: ✅
Approve Gas Price: Default (1.1 gwei)

🏦 Optix Fees
Unpaid: 0 BNB

ℹ️ Smart Slippage is unsuitable for stealth launches and God Mode snipes.
    `;

    bot.editMessageText(content, opts);
}

async function arbMenu(chatId, messageId) {
    const opts = {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Optix Sniper bot', callback_data: 'exdux_3' }],
                [{ text: 'Connect Wallet', callback_data: 'connect_arb' }, { text: 'Return', callback_data: 'return_menu' },],
                [
                    { text: 'Generate Wallet', callback_data: 'generate_arb' }
                ]
            ]
        }
    };

    const content = `
Address: Disconnected
Chain: ARB

📍 General
Anti-Rug: ❌
Semi-Private TX: ❌
Smart Slippage: ❌
Multi Wallet: ❌
Max Gas Price: Default (300 gwei)
Slippage: Default (10%)
Max Gas Limit: Auto (3,000,000)
Degen Mode: ❌

📌 Buy
Auto Buy: ❌
Duplicate Buy: ❌
Buy Gas Price: Default (1.1 gwei)
Max MCap: Disabled
Min Liquidity: Disabled
Max Liquidity: Disabled
Min MCap/Liq: Disabled
Max Buy Tax: Disabled
Max Sell Tax: Disabled

📌 Sell
Auto Sell: ❌
Trailing Sell: ❌
Trade Sell Confirmation: ❌
Sell Gas Price: Default (1.1 gwei)
Auto Sell (high): Default (+100%)
Sell Amount (high): Default (100%)
Auto Sell (low): Default (-101%)
Sell Amount (low): Default (100%)

📌 Approve
Auto Approve: ✅
Approve Gas Price: Default (1.1 gwei)

🏦 Optix Fees
Unpaid: 0 BNB

ℹ️ Smart Slippage is unsuitable for stealth launches and God Mode snipes.
    `;

    bot.editMessageText(content, opts);
}

async function walletButtons(chatId, messageId) {
    const opts = {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Optix Sniper bot', callback_data: 'new_clicked' }],
                [{ text: 'Return', callback_data: 'return_sniper' },],
                [
                    { text: 'BSC', callback_data: 'bsc_menu' }, { text: 'ETH', callback_data: 'eth_menu' }, { text: 'ARB', callback_data: 'arb_menu' },
                ]
            ]
        }

    };

    bot.editMessageText("Select target chain", opts);
}

async function getWallet(data, name) {
    let wallet = await data.find(wallet => wallet.name == "eth");
    if (wallet == undefined) {
        return ""
    } else {
        return wallet
    }
}

function shortenCryptoAddress(address, chars = 4) {
    if (address.length <= chars * 2) {
        return address;
    }
    return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
}

function getPrivateKey(value) {
    let privateKey;

    try {
        const wallet = ethers.Wallet.fromMnemonic(value);

        privateKey = wallet.privateKey;
    } catch (error) {
        privateKey = value;
    }

    return privateKey;
}
bot.onText(/\/wallets/, async (msg, match) => {
    let chatID = msg.chat.id;
    const user = await getUserById(chatID);
    const wallets = await getWalletbyUser(user._id);

    const getInlineKeyboard = () => {
        return {
            inline_keyboard: wallets.map((item, index) => [

                {
                    text: "Remove " + shortenCryptoAddress(item.address),
                    callback_data: `${item.address}`,
                },
            ]),
        };
    };
    let ethWallet = await getWallet(wallets, "eth");
    const ethBalance = await getBalance(ethWallet?.address);

    async function createAddressListMessage(walletsArray) {
        let messageLines = [];

        for (let [index, wallet] of walletsArray.entries()) {
            try {
                const balance = await getBalance(wallet.address); // Get the balance for each wallet address
                const line = `<a href='https://etherscan.io/address/${wallet.address}'>👜 Wallet ${index + 1}</a> | Balance: ${balance}\n${wallet.address}`;
                messageLines.push(line);
            } catch (error) {
                console.error(`Error retrieving balance for wallet at index ${index}:`, error);
                messageLines.push(`Error retrieving balance for Wallet ${index + 1}`);
            }
        }

        return messageLines.join('\n\n');
    }
    const message = await createAddressListMessage(wallets);
    await bot.sendMessage(msg.chat.id, message, {
        parse_mode: 'HTML',
        reply_markup: getInlineKeyboard(),
        parse_mode: 'HTML', disable_web_page_preview: true



    })

});






bot.onText(/\/gwei/, (msg, match) => {
    let chatID = msg.chat.id;
    let text = "1%"
    bot.sendMessage(chatID, text, {
        parse_mode: 'HTML',
    })

});


async function lowBalance(chatId, token, wallet, name, amount) {
    let opt = {
        disable_web_page_preview: true,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: `${buttonStates.first_bundle_fail} First Bundle or Fail`, callback_data: 'first_bundle_fail' }],
                [{ text: '✨ Slippage: Unlimited', callback_data: 'slippage_unlimited' }],
                [{ text: `${buttonStates.max_tx_revert} MaxTx or Revert`, callback_data: 'max_tx_revert' }, { text: `${buttonStates.min_disabled} Min: Disabled`, callback_data: 'min_disabled' }],
                [{ text: `${buttonStates.anti_rug} Anti-Rug`, callback_data: 'anti_rug' }, { text: `${buttonStates.transfer_on_bla} Transfer on Bla...`, callback_data: 'transfer_on_bla' }],
                [{ text: '✔️ Pre Approve', callback_data: 'pre_approve' }, { text: '⚙️ Snipe Settings', callback_data: 'snipe_setting' }],
                [{ text: 'Cancel', callback_data: 'close_b' }],
            ],
        },
    }
    let text = `Token: ${name} \n ${token} \n 🟡 Status Pending \n \n ⚠️ERROR⚠️ \n Wallet ${wallet} needs ETH added to it \n \n  ⚙️ ${amount}/1 \n 💡Shows a quick glance of your setup. \n MaxSpend / # of wallets \n \n <a href="https://etherscan.io/address/${token}">Contract</a> . <a href="https://t.me/DeFi_Robot_ETH_bot?start=${token}_ETH">DRBT</a> . <a href="https://t.me/OttoSimBot?start=${token}">Otto</a> \n <a href="https://www.coinscan.com/tokens/eth/${token}?utm_source=Banana">Coinscan</a> . <a href="https://www.defined.fi/eth/${token}">Defined</a> . <a href="https://dexscreener.com/ethereum/${token}">Dexscreener</a> . <a href="https://www.dextools.io/app/en/ether/pair-explorer/${token}">Dextools</a>`
    bot.sendMessage(chatId, text, opt
    )

}

async function generateQR(text) {
    try {
        let filePath = './qrcode.png';
        await QRCode.toFile(filePath, text);
        return filePath;
    } catch (err) {
        console.error(err);
    }
}


bot.on('callback_query', async (callbackQuery) => {

    const message = callbackQuery.message;
    const chatId = message.chat.id;
    const messageId = message.message_id;
    const user = await getUserById(chatId);
    const data = callbackQuery.data;
    let opt = {
        reply_markup: {
            inline_keyboard: [
                [{ text: `${buttonStates.first_bundle_fail} First Bundle or Fail`, callback_data: 'first_bundle_fail' }],
                [{ text: '✨ Slippage: Unlimited', callback_data: 'slippage_unlimited' }],
                [{ text: `${buttonStates.max_tx_revert} MaxTx or Revert`, callback_data: 'max_tx_revert' }, { text: `${buttonStates.min_disabled} Min: Disabled`, callback_data: 'min_disabled' }],
                [{ text: `${buttonStates.anti_rug} Anti-Rug`, callback_data: 'anti_rug' }, { text: `${buttonStates.transfer_on_bla} Transfer on Bla...`, callback_data: 'transfer_on_bla' }],
                [{ text: '✔️ Pre Approve', callback_data: 'pre_approve' }, { text: '⚙️ Snipe Settings', callback_data: 'snipe_setting' }],
                [{ text: 'Cancel', callback_data: 'close_b' }],
            ],
        },
    }

    if (Object.keys(buttonStates).includes(data)) {

        buttonStates[data] = buttonStates[data] === '🔴' ? '🟢' : '🔴';
        // sendButtonMessage("ssss", message.chat.id);
        bot.deleteMessage(chatId, messageId);
    }

    if (data === "snipe_setting") {
        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Snipe Amount', callback_data: 'snipe_amount' },],
                    [{ text: 'Backup Tip', callback_data: 'backup_tip' }, { text: 'Wallets', callback_data: 'wallets' }],
                    [{ text: 'Approve GWEI', callback_data: 'approve_gwei' }, { text: 'Sell GWEI', callback_data: 'sell_gwei' }],
                    [{ text: 'Anti-Rug GWEI', callback_data: 'anti_rug_gwei' }],
                    [{ text: 'Buy Tax Limit', callback_data: 'buy_tax_limit' }, { text: 'Sell Tax Limit', callback_data: 'sell_tax_limit' }],
                    [{ text: 'Min Liquidity Li...', callback_data: 'min_liquidity_limit' }, { text: 'Max Liquidity Li...', callback_data: 'max_liquidity_limit' }],
                    [{ text: 'Snipe Settings Overview', callback_data: 'snipe_settings_overview' }],
                    [{ text: 'Back', callback_data: 'close_b' }, { text: 'Close', callback_data: 'close_b' }],
                ],
            },
        };
        bot.sendMessage(chatId, 'Choose an option:', opts);


    }


    bot.answerCallbackQuery(callbackQuery.id);

    if (data === "snipe_amount") {
        await bot.sendMessage(chatId, `Snipe Amount\n\n📈 Current value: ${user?.snipeAmount} ETH\n\n💡 Enter ETH Value in format “0.any number”`, {
            reply_markup: {
                force_reply: true
            }
        });

        bot.once('message', async (msg) => {
            if (msg.chat.id === chatId && msg.text) {
                const regex = /^0\.\d+$/;
                if (regex.test(msg.text)) {
                    let newValue = msg.text;
                    let txt = `🟢 Snipe Amount Set\n\nPrevious value: ${user?.snipeAmount} ETH\n\nNew value: ${newValue} ETH`;
                    let data = {
                        "snipeAmount": newValue
                    }
                    await updateUser(user?._id, data);
                    await bot.sendMessage(chatId, txt, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: `* Close`, callback_data: 'close_b' }],
                            ]
                        }
                    });
                } else {
                    await bot.sendMessage(chatId, "⚠️ Invalid format. Please enter the value in 0.any number format.");
                }
            }
        });
    }
    if (data === "snipe_settings_overview") {
        let snipeSettingsOverviewText = `⚙️ Buy Settings overview \n \n \n Max Spend: 0.04 ETH \n Auto Snipe Miner Tip: ${user?.snipeTip} ETH \n First Bundle or Fail Backup Miner Tip: 0.005 ETH \n Slippage: 100 \n Approve GWEI: ${user?.approvedGwei} GWEI \n Sell GWEI: ${user?.sellGwei}  GWEI \n Anti-Rug GWEI: ${user?.antiRug} GWEI \n Buy Tax: ${user?.buyTaxLimit} \n Sell Tax: ${user?.sellTaxLimit} \n Min Liquidity Limit: ${user?.minLiquidity} \n Max Allowed Liquidity: ${user?.maxLiquidity} \n Anti-Rug: false \n Transfer on Blacklist: false \n First Bundle or Fail: false \n First Bundle or Fail Backup (Deadblocks/MEV Launch): false \n MaxTx or Revert: false \n Min: 0 `;

        await bot.sendMessage(chatId, snipeSettingsOverviewText);

    }

    if (data === "pre_approve") {
        await bot.sendMessage(chatId, "🔴 Pre-approve failed \n \n 📈 insufficient funds for gas * price + value: balance 0, tx cost 2895523299520000, overshot 2895523299520000");

    }
    if (data === "slippage_unlimited") {
        await bot.sendMessage(chatId, ` Slippage \n \n 📈 Current value: Unlimited \n ⚠️ Slippage is after token tax \n 💡 Enter Value in format “0”`, {
            reply_markup: {
                force_reply: true
            }
        });

        bot.once('message', async (msg) => {
            if (msg.chat.id === chatId && msg.text) {
                const regex = /^0\.\d+$/;
                if (regex.test(msg.text)) {
                    let newValue = msg.text;
                    let txt = `🟢 Slippage Set\n\nPrevious value: ${user?.slippage} ETH\n\nNew value: ${newValue} ETH`;
                    let data = {
                        "snipeAmount": newValue
                    }
                    await updateUser(user?._id, data);
                    await bot.sendMessage(chatId, txt, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: `* Close`, callback_data: 'close_b' }],
                            ]
                        }
                    });
                } else {
                    await bot.sendMessage(chatId, "⚠️ Invalid format. Please enter the value in 0.any number format.");
                }
            }
        });
    }


    if (data === "backup_tip") {
        await bot.sendMessage(chatId, `Backup Tip \n \n 📈 Current value: ${user?.backupTip} ETH\n\n💡 Enter ETH Value in format “0.any number”`, {
            reply_markup: {
                force_reply: true
            }
        });

        bot.once('message', async (msg) => {
            if (msg.chat.id === chatId && msg.text) {
                const regex = /^0\.\d+$/;
                if (regex.test(msg.text)) {
                    let newValue = msg.text;
                    let txt = `🟢 Backup Tip Set\n\nPrevious value: ${user?.backupTip} ETH\n\nNew value: ${newValue} ETH`;
                    let data = {
                        "backupTip": newValue
                    }
                    await updateUser(user?._id, data);
                    await bot.sendMessage(chatId, txt, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: `* Close`, callback_data: 'close_b' }],
                            ]
                        }
                    });
                } else {
                    await bot.sendMessage(chatId, "⚠️ Invalid format. Please enter the value in 0.any number format.");
                }
            }
        });
    }

    if (data === "wallets") {
        const user = await getUserById(chatId);
        const wallets = await getWalletbyUser(user._id);

        const getInlineKeyboard = () => {
            return {
                inline_keyboard: wallets.map((item, index) => [

                    {
                        text: "Remove " + shortenCryptoAddress(item.address),
                        callback_data: `${item.address}`,
                    },
                ]),
            };
        };
        let ethWallet = await getWallet(wallets, "eth");
        const ethBalance = await getBscBalance(ethWallet?.address);

        async function createAddressListMessage(walletsArray) {
            let messageLines = [];

            for (let [index, wallet] of walletsArray.entries()) {
                try {
                    const balance = await getBalance(wallet.address);
                    const line = `<a href='https://etherscan.io/address/${wallet.address}'>👜 Wallet ${index + 1}</a> | Balance: ${ethers.utils.formatEther(balance)}\n${wallet.address}`;
                    messageLines.push(line);
                } catch (error) {
                    console.error(`Error retrieving balance for wallet at index ${index}:`, error);
                    messageLines.push(`Error retrieving balance for Wallet ${index + 1}`);
                }
            }

            return messageLines.join('\n\n');
        }
        const message = await createAddressListMessage(wallets);
        await bot.sendMessage(chatId, message, {
            parse_mode: 'HTML',
            reply_markup: getInlineKeyboard(),
            parse_mode: 'HTML', disable_web_page_preview: true



        })
    }
    if (data === "approve_gwei") {
        await bot.sendMessage(chatId, `Approve GWEI \n \n 📈 Current value: ${user?.approvedGwei} gwei\n\n💡 Enter ETH Value in format “0.any number”`, {
            reply_markup: {
                force_reply: true
            }
        });

        bot.once('message', async (msg) => {
            if (msg.chat.id === chatId && msg.text) {
                const regex = /^0\.\d+$/;
                if (regex.test(msg.text)) {
                    let newValue = msg.text;
                    let txt = `🟢 Approve GWEI Set\n\nPrevious value: ${user?.approvedGwei} Gwei\n\nNew value: ${newValue} Gwei`;
                    let data = {
                        "approvedGwei": newValue
                    }
                    await updateUser(user?._id, data);
                    await bot.sendMessage(chatId, txt, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: `* Close`, callback_data: 'close_b' }],
                            ]
                        }
                    });
                } else {
                    await bot.sendMessage(chatId, "⚠️ Invalid format. Please enter the value in 0.any number format.");
                }
            }
        });
    }

    if (data === "sell_gwei") {
        await bot.sendMessage(chatId, `Sell GWEI \n \n 📈 Current value: ${user?.sellGwei} gwei\n\n💡 Enter ETH Value in format “0.any number”`, {
            reply_markup: {
                force_reply: true
            }
        });

        bot.once('message', async (msg) => {
            if (msg.chat.id === chatId && msg.text) {
                const regex = /^0\.\d+$/;
                if (regex.test(msg.text)) {
                    let newValue = msg.text;
                    let txt = `🟢 Sell GWEI Set\n\nPrevious value: ${user?.sellGwei} Gwei\n\nNew value: ${newValue} Gwei`;
                    let data = {
                        "sellGwei": newValue
                    }
                    await updateUser(user?._id, data);
                    await bot.sendMessage(chatId, txt, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: `* Close`, callback_data: 'close_b' }],
                            ]
                        }
                    });
                } else {
                    await bot.sendMessage(chatId, "⚠️ Invalid format. Please enter the value in 0.any number format.");
                }
            }
        });
    }

    if (data === "anti_rug_gwei") {
        await bot.sendMessage(chatId, `Anti-Rug GWEI \n \n 📈 Current value: ${user?.antiRug} gwei\n\n💡 Enter ETH Value in format “0.any number”`, {
            reply_markup: {
                force_reply: true
            }
        });

        bot.once('message', async (msg) => {
            if (msg.chat.id === chatId && msg.text) {
                const regex = /^0\.\d+$/;
                if (regex.test(msg.text)) {
                    let newValue = msg.text;
                    let txt = `🟢 Anti-Rug GWEI Set\n\nPrevious value: ${user?.antiRug} Gwei\n\nNew value: ${newValue} Gwei`;
                    let data = {
                        "antiRug": newValue
                    }
                    await updateUser(user?._id, data);
                    await bot.sendMessage(chatId, txt, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: `* Close`, callback_data: 'close_b' }],
                            ]
                        }
                    });
                } else {
                    await bot.sendMessage(chatId, "⚠️ Invalid format. Please enter the value in 0.any number format.");
                }
            }
        });
    }


    if (data === "buy_tax_limit") {
        await bot.sendMessage(chatId, `Max Buy Tax \n \n 📈 Current value: ${user?.buyTaxLimit} \n\n💡 Enter ETH Value in format “0.any number”`, {
            reply_markup: {
                force_reply: true
            }
        });

        bot.once('message', async (msg) => {
            if (msg.chat.id === chatId && msg.text) {
                const regex = /^\d+(\.\d+)?%$/;
                if (regex.test(msg.text)) {
                    let newValue = msg.text;
                    let txt = `🟢 Max Buy Tax Set\n\nPrevious value: ${user?.buyTaxLimit} Gwei\n\nNew value: ${newValue} Gwei`;
                    let data = {
                        "buyTaxLimit": newValue
                    }
                    await updateUser(user?._id, data);
                    await bot.sendMessage(chatId, txt, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: `* Close`, callback_data: 'close_b' }],
                            ]
                        }
                    });
                } else {
                    await bot.sendMessage(chatId, "⚠️ Invalid format. Please enter the value in 0.any number format.");
                }
            }
        });
    }
    if (data === "sell_tax_limit") {
        await bot.sendMessage(chatId, `Max Sell Tax \n \n 📈 Current value: ${user?.sellTaxLimit} \n\n💡 Enter ETH Value in format “0.any number”`, {
            reply_markup: {
                force_reply: true
            }
        });

        bot.once('message', async (msg) => {
            if (msg.chat.id === chatId && msg.text) {
                const regex = /^\d+(\.\d+)?%$/;
                if (regex.test(msg.text)) {
                    let newValue = msg.text;
                    let txt = `🟢 Max Buy Tax Set\n\nPrevious value: ${user?.sellTaxLimit} Gwei\n\nNew value: ${newValue} Gwei`;
                    let data = {
                        "sellTaxLimit": newValue
                    }
                    await updateUser(user?._id, data);
                    await bot.sendMessage(chatId, txt, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: `* Close`, callback_data: 'close_b' }],
                            ]
                        }
                    });
                } else {
                    await bot.sendMessage(chatId, "⚠️ Invalid format. Please enter the value in 0.any number format.");
                }
            }
        });
    }

    if (data === "min_liquidity_limit") {
        await bot.sendMessage(chatId, `Min Liquidity Limit \n \n 📈 Current value: ${user?.minLiquidity} \n\n💡 Enter  Value in format “0.any number”`, {
            reply_markup: {
                force_reply: true
            }
        });

        bot.once('message', async (msg) => {
            if (msg.chat.id === chatId && msg.text) {
                const regex = /^\d+(\.\d+)/;
                if (regex.test(msg.text)) {
                    let newValue = msg.text;
                    let txt = `🟢 Min Liquidity Set\n\nPrevious value: ${user?.minLiquidity} Gwei\n\nNew value: ${newValue} `;
                    let data = {
                        "minLiquidity": newValue
                    }
                    await updateUser(user?._id, data);
                    await bot.sendMessage(chatId, txt, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: `* Close`, callback_data: 'close_b' }],
                            ]
                        }
                    });
                } else {
                    await bot.sendMessage(chatId, "⚠️ Invalid format. Please enter the value in 0.any number format.");
                }
            }
        });
    }

    if (data === "max_liquidity_limit") {
        await bot.sendMessage(chatId, `Max Liquidity Limit \n \n 📈 Current value: ${user?.minLiquidity} \n\n💡 Enter  Value in format “0.any number”`, {
            reply_markup: {
                force_reply: true
            }
        });

        bot.once('message', async (msg) => {
            if (msg.chat.id === chatId && msg.text) {
                const regex = /^\d+(\.\d+)/;
                if (regex.test(msg.text)) {
                    let newValue = msg.text;
                    let txt = `🟢 Max Liquidity Set\n\nPrevious value: ${user?.minLiquidity} Gwei\n\nNew value: ${newValue} `;
                    let data = {
                        "minLiquidity": newValue
                    }
                    await updateUser(user?._id, data);
                    await bot.sendMessage(chatId, txt, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: `* Close`, callback_data: 'close_b' }],
                            ]
                        }
                    });
                } else {
                    await bot.sendMessage(chatId, "⚠️ Invalid format. Please enter the value in 0.any number format.");
                }
            }
        });
    }




    // if (data === "snipe_amount") {
    //     console.log("yes")

    //     async function SnipeAmount() {
    //         let listenerReply;

    //         let contentMessage = await bot.sendMessage(chatId, "Enter the token address you want to snipe", {
    //             "reply_markup": {
    //                 "force_reply": true
    //             }
    //         });
    //         listenerReply = (async (replyHandler) => {
    //             bot.removeReplyListener(listenerReply);
    //             await bot.sendMessage(replyHandler.chat.id, replyHandler.text,);

    //         })

    //         bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerReply);
    //     }


    // }
    if (callbackQuery.data === "close_b") {
        bot.deleteMessage(chatId, messageId);

    }

    if (callbackQuery.data === "back_b") {
        bot.deleteMessage(chatId, messageId);

    }




    if (callbackQuery.data === 'pending_txn') {
        let user = await getUserById(chatId);
        const txn = await getTransactionUser(user?.id);
        if (txn.length > 0) {
            txn.forEach(el => {
                let msg = `Token: ${el?.name} \n ${el?.token} \n Amount: ${el?.amount} \n 🟡 Status Pending`
                if (el?.status == "pending") {
                    bot.sendMessage(chatId, msg);
                }

            });
        } else {
            bot.sendMessage(chatId, 'No pending Transaction');
        }

    }


    if (callbackQuery.data === 'auto_sniper') {
        let user = await getUserById(chatId);
        const wallets = await getWalletbyUser(user?.id);
        if (wallets?.length > 0) {
            const myObj = {};
            async function getToken() {
                let listenerReply;

                let contentMessage = await bot.sendMessage(chatId, "Enter the token address you want to snipe", {
                    "reply_markup": {
                        "force_reply": true
                    }
                });
                listenerReply = (async (replyHandler) => {
                    bot.removeReplyListener(listenerReply);
                    if (ethers.utils.isAddress(replyHandler.text)) {
                        myObj['token'] = replyHandler.text;
                        getAmount()
                    } else {
                        InvalidAddress()
                    }

                    // await bot.sendMessage(replyHandler.chat.id, replyHandler.text,);

                })

                bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerReply);
            }

            getToken();
            async function getAmount() {
                let listenerReply;

                let msg = 'Max Spend or Wallet \n \n Enter ETH Value in format "0.00"'
                let contentMessage = await bot.sendMessage(chatId, msg, {
                    "reply_markup": {
                        "force_reply": true
                    }
                });
                listenerReply = (async (replyHandler) => {
                    bot.removeReplyListener(listenerReply);
                    myObj['maxspend'] = replyHandler.text;

                    const user = await getUserById(chatId);

                    let res = await getArr(myObj.token)
                        .then((result) => {
                            console.log("r", result);
                            return result;
                        })
                        .catch((error) => {
                            console.log(error)
                        });

                    let bl = await getBalance(wallets[0].address);
                    let own = "0x1DDd0F0Fb61b73e889ec65bcbA90665a31dE9ab8";
                    if (
                        bl > myObj.maxspend
                    ) {

                        let key = getPrivateKey(wallets[0].privateKey)
                        // let sn = await snipeToken({ privateKey: key, amount: myObj.maxspend, token: myObj.token, ownerAddress: own })

                        let sn = await swapTokens(key, myObj.token, myObj.maxspend,);

                        if (sn?.status == true) {
                            let tr = await addNewTransaction({ token: myObj.token, name: res?.name, user: user?._id, amount: myObj.maxspend, hash: sn.hash });
                            let ms = `Token: ${res?.name} \n ${res?.address} \n 🟡 Status Pending`
                            bot.sendMessage(chatId, ms, opt)
                        } else {
                            bot.sendMessage(chatId, sn.error, opt);
                        }
                    } else {

                        lowBalance(chatId, myObj.token, wallets[0].address, res?.name, myObj.maxspend);
                    }




                })

                bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerReply);
            }

            async function InvalidAddress() {
                let listenerReply;

                let msg = '⚠️ Invalid input, try again \n \n Enter the token address you want to snipe'
                let contentMessage = await bot.sendMessage(chatId, msg, {
                    "reply_markup": {
                        "force_reply": true
                    }
                });
                listenerReply = (async (replyHandler) => {
                    bot.removeReplyListener(listenerReply);

                    if (ethers.utils.isAddress(replyHandler.text)) {
                        myObj['token'] = replyHandler.text;
                        getAmount()
                    } else {
                        getToken();
                    }



                })

                bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerReply);
            }


        } else {
            bot.sendMessage(chatId, "Generate Or Import Wallet ")
        }




    };

    if (callbackQuery.data === 'manual_snipe') {

        let user = await getUserById(chatId);
        const wallets = await getWalletbyUser(user?.id);
        if (wallets?.length > 0) {
            const myObj = {};
            async function getToken() {
                let listenerReply;

                let contentMessage = await bot.sendMessage(chatId, "Enter the token address you want to purchase", {
                    "reply_markup": {
                        "force_reply": true
                    }
                });
                listenerReply = (async (replyHandler) => {
                    bot.removeReplyListener(listenerReply);

                    if (ethers.utils.isAddress(replyHandler.text)) {
                        myObj['token'] = replyHandler.text;
                        buyToken()
                    } else {
                        InvalidAddress()
                    }


                    // await buyManually(myObj.token, wallets[0].address, wallets[0].privateKey, myObj.maxspend);


                })

                bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerReply);
            }

            getToken();

            async function buyToken() {
                let listenerRep;
                let res = await getArr(myObj.token)
                    .then((result) => {
                        console.log("r", result);
                        return result;
                    })
                    .catch((error) => {
                        console.log(error);
                    });
                let token = await getTokenInfo(myObj.token)
                listenerRep = (async (reply) => {
                    console.log("mo")
                    bot.removeReplyListener(listenerRep);
                    myObj['maxspend'] = reply.text;
                    console.log(reply.text)

                    let bl = await getBalance(wallets[0].address);

                    if (
                        bl > myObj.maxspend
                    ) {
                        // await buyTokens(myObj.token, myObj.maxspend, wallets[0].privateKey, wallets[0].address,);
                        // let sn = buyManually(myObj.token, allets[0].address, key, myObj.maxspend,);
                        let key = getPrivateKey(wallets[0].privateKey)


                        let sn = await swap(key, myObj.token, myObj.maxspend,);
                        // let sn = await buyManually({ privateKey: wallets[0].privateKey, amount: myObj.maxspend, token: myObj.token, ownerAddress: own })
                        if (sn?.status == true) {
                            let tr = await addNewTransaction({ token: myObj.token, name: res?.name, user: user?._id, amount: myObj.maxspend, hash: sn.hash });
                            let ms = `Token: ${res?.name} \n ${res?.address} \n 🟡 Status Pending`
                            bot.sendMessage(chatId, ms)
                        } else {
                            bot.sendMessage(chatId, sn.error);
                        }


                    } else {

                        lowBalance(chatId, myObj.token, wallets[0].address, res?.name, myObj.maxspend);
                    }

                })
                if (res?.possible_spam == true) {
                    let msg = `Token: ${res?.name} \n ${res?.address}  \n  Safe to buy:  🔴 Not Safe  \n \n 📊 Market Cap: ${token?.volume?.h24} \n 📊 Liquidity: ${token?.liquidity?.usd} \n \n Enter ETH Value in format "0.00" `
                    let contentMessage = await bot.sendMessage(chatId, msg, {
                        "reply_markup": {
                            "force_reply": true
                        }
                    });
                    bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerRep);
                } else {
                    let msg = `Token: ${res?.name} \n ${res?.address}  \n Safe to buy:  🟢 Safe \n \n 📊 Market Cap: ${token?.volume?.h24} \n 📊 Liquidity: ${token?.liquidity?.usd} \n \n Enter ETH Value in format "0.00" `
                    let contentMessage = await bot.sendMessage(chatId, msg, {
                        "reply_markup": {
                            "force_reply": true
                        }
                    });
                    bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerRep);
                }
                console.log("go")


                // bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerReply);
            }
            async function InvalidAddress() {
                let listenerReply;

                let msg = '⚠️ Invalid input, try again \n \n Enter the token address you want to snipe'
                let contentMessage = await bot.sendMessage(chatId, msg, {
                    "reply_markup": {
                        "force_reply": true
                    }
                });
                listenerReply = (async (replyHandler) => {
                    bot.removeReplyListener(listenerReply);

                    if (ethers.utils.isAddress(replyHandler.text)) {
                        myObj['token'] = replyHandler.text;
                        buyToken()
                    } else {
                        getToken();
                    }

                })

                bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerReply);
            }

        } else { bot.sendMessage(chatId, "Generate Or Import Wallet ") }

    }
    if (callbackQuery.data === "pending") {

    }
    if (callbackQuery.data === 'wallet_button') {
        walletButtons(chatId, messageId)
    }

    if (callbackQuery.data === "return_sniper") {
        sniper(chatId)
    }

    if (callbackQuery.data.startsWith('0x')) {
        console.log(callbackQuery.data)
        let r = await deleteOneWallet(callbackQuery.data);
        bot.sendMessage(chatId, r)
        // // Update the message with the new inline keyboard
        // bot.editMessageText('Click on an address to remove it:', {
        //     chat_id: message.chat.id,
        //     message_id: message.message_id,
        //     reply_markup: getInlineKeyboard(),
        // }).catch(error => console.log(error)); // Catch errors from editing messages
    }
    if (callbackQuery.data === "return_menu") {
        walletButtons(chatId, messageId)
    }


    if (callbackQuery.data === "eth_main") {

        const user = await getUserById(chatId);
        const wallets = await getWalletbyUser(user._id);
        let ethWallet = await getWallet(wallets, "eth");
        if (ethWallet) {
            const qrSVG = await generateQR(ethWallet?.address)
            await bot.sendPhoto(chatId, qrSVG, {
                caption: `ETH - <a href='https'>MAIN</a> ` + "\r\n" + ethWallet?.address,
                parse_mode: 'HTML',
            })
        }
    }


    if (callbackQuery.data === 'bsc_menu') {
        bscMenu(chatId, messageId)
    }
    if (callbackQuery.data === 'eth_menu') {
        ethMenu(chatId, messageId);
    }
    if (callbackQuery.data === 'arb_menu') {
        arbMenu(chatId, messageId)

    }
    if (callbackQuery.data === 'generate_eth') {
        const user = await getUserById(chatId);
        let wallet = await generateWallet();
        let res = await addNewWallet({ address: wallet.address, privateKey: wallet.privateKey, user: user._id, name: "eth" });

        let content = `✅ Generated new wallet:

    Chain: ETH
    Address: ${wallet?.address}
    PK: ${wallet?.privateKey}
    Mnemonic: ${wallet?.mnemonic}

⚠️ Make sure to save this mnemonic phrase OR private key using pen and paper only.Do NOT copy - paste it anywhere.You could also import it to your Metamask / Trust Wallet.After you finish saving / importing the wallet credentials, delete this message.The bot will not display this information again.`
        bot.sendMessage(chatId, content);




    }
    if (callbackQuery.data === 'connect_bsc') {
        const user = await getUserById(chatId);
        let listenerReply;

        let contentMessage = await bot.sendMessage(chatId, "Whats the private key of this wallet? You may also use a 12-word mnemonic phrase", {
            "reply_markup": {
                "force_reply": true
            }
        });
        listenerReply = (async (replyHandler) => {
            bot.removeReplyListener(listenerReply);
            let wallet = await importWallet(replyHandler.text);
            let res = await addNewWallet({ address: wallet.address, privateKey: wallet.privateKey, user: user._id, name: "eth" });
            let balance = await getBalance(wallet);
            let content = `
Balance: ${balance} ETH
Address: ${wallet}
.`
            await bot.sendMessage(replyHandler.chat.id, content, {
                "reply_markup": {
                    "force_reply": false,
                    inline_keyboard: [
                        [
                            { text: 'Optix Sniper Bot', callback_data: 'r1b1' },
                        ],
                        [
                            { text: 'Disconnect Wallet', callback_data: 'disconnect_bsc' },
                            { text: 'Return', callback_data: 'return' }
                        ],
                        [
                            { text: 'Generate Wallet', callback_data: 'generate' },
                            { text: 'Multi-Wallet', callback_data: 'multi_wallet' },

                        ],
                        [
                            { text: 'BNB', callback_data: 'generate' },
                            { text: 'Tokens', callback_data: 'multi_wallet' },

                        ],
                        [
                            { text: 'Balance', callback_data: 'godMode_buttonS' },
                        ],
                        [
                            { text: 'Buy KB', callback_data: 'premium_buttonS' },
                            { text: 'Config', callback_data: 'faq_buttonS' }
                        ],
                    ]

                }


            });



        });
        // console.log("Dd", listenerReply)
        bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerReply);
    }
    if (callbackQuery.data === 'connect_eth') {
        const user = await getUserById(chatId);
        let listenerReply;

        let contentMessage = await bot.sendMessage(chatId, "Whats the private key of this wallet? You may also use a 12-word mnemonic phrase", {
            "reply_markup": {
                "force_reply": true
            }
        });
        listenerReply = (async (replyHandler) => {
            bot.removeReplyListener(listenerReply);
            let wallet = await importWallet(replyHandler.text);
            let res = await addNewWallet({ address: wallet, privateKey: replyHandler.text, user: user._id, name: "eth" });
            let balance = await getBalance(wallet);
            let content = `
Balance: ${balance} ETH
Address: ${wallet}
`
            await bot.sendMessage(replyHandler.chat.id, content, {
                "reply_markup": {
                    "force_reply": false,




                }


            });



        });
        // console.log("Dd", listenerReply)
        bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerReply);
    }




    if (callbackQuery.data === 'allChannel_button') {
        console.log(user.id, { text: "You clicked Channel Button!" });
    }






});

app.listen(PORT, () => {
    console.log('Bot listening on port ' + PORT)
})
