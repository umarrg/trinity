const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const User = new Schema({
    chatId: { type: Number, },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});



module.exports = mongoose.model('User', User);