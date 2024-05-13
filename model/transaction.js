const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Transactions = new Schema({
    token: { type: String, },
    name: { type: String, },
    status: { type: String, default: "pending" },
    amount: { type: String, },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

});



module.exports = mongoose.model('Transactions', Transactions);