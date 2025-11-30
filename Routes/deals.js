const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { AppError, asyncHandler } = require('../Utils/error.js');
const { logger, requestLogger, consoleLogger } = require('../Utils/logger.js');
const { ROLES } = require('../Models/User.js');

const app = express();

const Deal = require('../Models/Deal.js');
const User = require('../Models/User.js');
const Comment = require('../Models/Comment.js');
const Vote = require('../Models/Vote.js');

User.ROLES.ADMIN
User.ROLES.MODERATOR

const {
    generateToken,
    authenticateUser,
    requiredRole,
    requireAnyRole
} = require('../middleware/auth.js');

const router = express.Router();

router.post("/", authenticateUser, asyncHandler(async (req, res) => {
    console.log("Creating a deal:", req.body);
    
    const { title, price, description, category } = req.body;

    if (!title || !price || !description || !category) {
        throw new AppError("Missing required fields", 400);
    }

    const newDeal = new Deal({
        title,
        price,
        description,
        category,
        authorId: req.user._id
    });

    const savedDeal = await newDeal.save();

    savedDeal.url = `TPDealExpress/deal/${savedDeal._id}`;

    await savedDeal.save();

    res.status(201).json({
        message: "Deal created",
        deal: savedDeal
    });
}));

router.get("/", asyncHandler(async (req, res) => {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    
    const deals = await Deal.find({ status: "approved" })
        .sort({ createdAt: -1 }) 
        .skip(skip)
        .limit(limit)
        .populate("authorId", "username"); 

    const total = await Deal.countDocuments({ status: "approved" });

    res.status(200).json({
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        deals
    });
}));

router.get("/search", asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim() === "") {
        return res.status(400).json({ message: "Query parameter 'q' is required." });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const searchRegex = new RegExp(q, "i");

    const deals = await Deal.find({
        status: "approved",
        $or: [
            { title: searchRegex },
            { description: searchRegex }
        ]
    })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Deal.countDocuments({
        status: "approved",
        $or: [
            { title: searchRegex },
            { description: searchRegex }
        ]
    });

    res.status(200).json({
        query: q,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        deals
    });
}));

router.get("/:id", asyncHandler(async (req, res) => {
    const { id } = req.params;

    const deal = await Deal.findById(id)
        .populate("authorId", "username email role")
        .exec();

    if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
    }

    const comments = await Comment.find({ dealId: id })
        .populate("authorId", "username")
        .sort({ createdAt: -1 });

    const hotVotes = await Vote.countDocuments({ dealId: id, type: "hot" });
    const coldVotes = await Vote.countDocuments({ dealId: id, type: "cold" });

    const temperature = hotVotes - coldVotes;

    res.status(200).json({
        deal,
        comments,
        votes: {
            hot: hotVotes,
            cold: coldVotes,
            temperature: temperature
        }
    });
}));

router.put("/:id", authenticateUser, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const deal = await Deal.findById(id);
    if (!deal) return res.status(404).json({ message: "Deal not found" });

    if (deal.authorId.toString() !== userId.toString() && req.user.role !== ROLES.ADMIN) {
        return res.status(403).json({ message: "You do not have permission to modify this deal" });
    }

    if (deal.status !== "pending") {
        return res.status(400).json({ message: "Only deals with status 'pending' can be edited" });
    }

    const allowedUpdates = ["title", "description", "price", "originalPrice", "url", "category"];
    const updates = req.body;

    Object.keys(updates).forEach(field => {
        if (allowedUpdates.includes(field)) {
            deal[field] = updates[field];
        }
    });

    const updatedDeal = await deal.save();

    res.status(200).json({
        message: "Deal updated successfully",
        deal: updatedDeal
    });
}));

router.delete("/:id", authenticateUser, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const deal = await Deal.findById(id);
    if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
    }

    if (deal.authorId.toString() !== userId.toString() && req.user.role !== ROLES.ADMIN) {
        return res.status(403).json({ message: "You do not have permission to delete this deal" });
    }

    await deal.deleteOne();

    res.status(200).json({
        message: "Deal deleted successfully"
    });
}));

router.get("/:dealId/comments", asyncHandler(async (req, res) => {
    const { dealId } = req.params;

    const deal = await Deal.findById(dealId);
    if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
    }

    const comments = await Comment.find({ dealId })
        .populate("authorId", "username")
        .sort({ createdAt: -1 });

    res.status(200).json({
        dealId,
        total: comments.length,
        comments
    });
}));

router.post("/:dealId/comments", authenticateUser, asyncHandler(async (req, res) => {
    const { dealId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === "") {
        return res.status(400).json({ message: "Content is required" });
    }

    const deal = await Deal.findById(dealId);
    if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
    }

    const comment = new Comment({
        content,
        dealId,
        authorId: req.user._id
    });

    await comment.save();

    const populatedComment = await Comment.findById(comment._id)
        .populate("authorId", "username");

    res.status(201).json({
        message: "Comment added",
        comment: populatedComment
    });
}));

router.post("/:id/vote", authenticateUser, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { type } = req.body;
    const userId = req.user._id;

    if (!["hot", "cold"].includes(type)) {
        return res.status(400).json({ message: "Vote type must be 'hot' or 'cold'" });
    }

    const deal = await Deal.findById(id);
    if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
    }

    let vote = await Vote.findOne({ userId, dealId: id });

    if (!vote) {
        vote = new Vote({
            type,
            userId,
            dealId: id
        });
        await vote.save();

        deal.temperature += type === "hot" ? 1 : -1;
        await deal.save();

        return res.status(201).json({
            message: "Vote submitted",
            vote
        });

    } else {

        if (vote.type === type) {
            return res.status(400).json({ message: "You already voted this way" });
        }


        if (vote.type === "hot" && type === "cold") {
            deal.temperature -= 2; 
        } else {
            deal.temperature += 2; 
        }

        vote.type = type;
        await vote.save();
        await deal.save();

        return res.status(200).json({
            message: "Vote updated",
            vote
        });
    }
}));

router.delete("/:id/vote", authenticateUser, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;


    const vote = await Vote.findOne({ userId, dealId: id });

    if (!vote) {
        return res.status(404).json({ message: "You haven't voted for this deal" });
    }


    const deal = await Deal.findById(id);
    if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
    }

    if (vote.type === "hot") {
        deal.temperature -= 1;   
    } else {
        deal.temperature += 1;   
    }

    await deal.save();
    await vote.deleteOne();

    res.status(200).json({
        message: "Vote removed successfully"
    });
}));

module.exports = router;