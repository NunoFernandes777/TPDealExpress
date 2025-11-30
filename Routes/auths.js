const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { AppError, asyncHandler } = require('../Utils/error.js');
const { logger, requestLogger, consoleLogger } = require('../Utils/logger.js');
const { ROLES } = require('../Models/User.js');
const { registerValidation, loginValidation } = require('../Validators/authValidators');

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



router.post('/register', registerValidation, asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
    }

    const user = new User({ username, email, password });
    const savedUser = await user.save();

    const jwtToken = generateToken(savedUser._id);
    return res.status(201).json({
        message: "User registered successfully",
        user: savedUser,
        token: jwtToken
    });
}));

router.post('/login', loginValidation, asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ message: "Invalid email or password" });
    }

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
        return res.status(400).json({ message: "Invalid email or password" });
    }

    const jwtToken = generateToken(user._id);

    return res.status(200).json({
        message: "Login successful",
        user: user,
        token: jwtToken
    });
}));

router.get('/me', asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized: Bearer token missing" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        const user = await User.findById(userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "User info retrieved successfully",
            user
        });

    } catch (error) {

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired" });
        }
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Invalid token" });
        }

        console.error("Error in /me route:", error);
        res.status(500).json({ message: "Server error" });
    }
}));

module.exports = router;