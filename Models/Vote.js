const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['hot', 'cold'],
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dealId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deal',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Vote = mongoose.model('Vote', VoteSchema);
module.exports = Vote;