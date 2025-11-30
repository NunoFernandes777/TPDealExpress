const mongoose = require('mongoose');

const DealSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 5,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        required: true,
        minlength: 10,
        maxlength: 500
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    originalPrice: {
        type: Number,
        min: 0,
        default: null
    },
    url: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        enum: ['High-Tech', 'Maison', 'Mode', 'Loisirs', 'Autre'],
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    temperature: {
        type: Number,
        default: 0
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

module.exports = mongoose.model('Deal', DealSchema);
