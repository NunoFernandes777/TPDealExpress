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

const {
    generateToken,
    authenticateUser,
    requiredRole,
    requireAnyRole
} = require('../middleware/auth.js');

const router = express.Router();

router.get("/deals/pending", authenticateUser, requireAnyRole(["moderator", "admin"]),
    asyncHandler(async (req, res) => {
        
        const pendingDeals = await Deal.find({ status: "pending" })
            .populate("authorId", "username email");

        res.status(200).json({
            total: pendingDeals.length,
            deals: pendingDeals
        });
    })
);

router.patch("/deals/:id/moderate", authenticateUser, requireAnyRole(["moderator", "admin"]), asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !["approved", "rejected"].includes(status)) {
            return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
        }

        const deal = await Deal.findById(id);
        if (!deal) {
            return res.status(404).json({ message: "Deal not found" });
        }

        if (deal.status !== "pending") {
            return res.status(400).json({ message: "Only pending deals can be moderated" });
        }

        deal.status = status;
        await deal.save();

        res.status(200).json({
            message: `Deal ${status}`,
            deal
        });
    })
);

router.get("/users", authenticateUser, requireAnyRole(["admin"]), asyncHandler(async (req, res) => {

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalUsers = await User.countDocuments();

        const users = await User.find()
            .select("-password -token")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalUsers / limit);

        res.status(200).json({
            totalUsers,
            totalPages,
            currentPage: page,
            users
        });
    })
);

router.patch("/users/:id/role", authenticateUser, requireAnyRole(["admin"]), asyncHandler(async (req, res) => {

        const { id } = req.params;
        const { role } = req.body;

        const validRoles = ["user", "moderator", "admin"];
        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        if (req.user._id.toString() === id) {
            return res.status(400).json({ message: "You cannot change your own role" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.role = role;
        await user.save();

        res.status(200).json({
            message: "User role updated",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            }
        });
    })
);

module.exports = router;