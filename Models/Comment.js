const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 500
    },
    dealId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deal',
        required: true
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Comment = mongoose.model('Comment', CommentSchema);
module.exports = Comment;