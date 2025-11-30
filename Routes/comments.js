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

router.put("/:id", authenticateUser, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === "") {
        return res.status(400).json({ message: "Content is required" });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.authorId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "You are not allowed to edit this comment" });
    }

    comment.content = content.trim();
    await comment.save();

    res.status(200).json({
        message: "Comment updated",
        comment
    });
}));

router.delete("/:id", authenticateUser, asyncHandler(async (req, res) => {
    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
    }

    const isOwner = comment.authorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "You are not allowed to delete this comment" });
    }

    await comment.deleteOne();

    res.status(200).json({
        message: "Comment deleted"
    });
}));

module.exports = router;