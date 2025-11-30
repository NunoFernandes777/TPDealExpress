const jwt = require('jsonwebtoken');
const User = require('../Models/User');
const { JWT_SECRET } = process.env;

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Authenticate user from Bearer token
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Authorization header missing or malformed" });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password'); // remove password
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired" });
        }
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Invalid token" });
        }
        console.error("Authentication error:", error);
        res.status(500).json({ message: "Erreur lors de la vérification du token" });
    }
};

// Check if user has a specific role
const requiredRole = (requiredRole) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        if (req.user.role !== requiredRole) {
            return res.status(403).json({ message: "Insufficient permissions" });
        }
        next();
    };
};

// Check if user has at least one role from allowedRoles
const requireAnyRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Insufficient permissions" });
        }
        next();
    };
};

module.exports = {
    generateToken,
    authenticateUser,
    requiredRole,
    requireAnyRole
};