"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUserOrSuperAdmin = exports.requireSuperAdmin = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback');
        const user = await User_1.default.findByPk(decoded.userId);
        if (!user || !user.active) {
            return res.status(401).json({ error: 'Invalid or inactive user' });
        }
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};
exports.authenticateToken = authenticateToken;
const requireSuperAdmin = (req, res, next) => {
    if (req.user?.role !== 'superadmin') {
        return res.status(403).json({ error: 'Superadmin access required' });
    }
    next();
};
exports.requireSuperAdmin = requireSuperAdmin;
const requireUserOrSuperAdmin = (req, res, next) => {
    if (!['user', 'superadmin'].includes(req.user?.role)) {
        return res.status(403).json({ error: 'User or superadmin access required' });
    }
    next();
};
exports.requireUserOrSuperAdmin = requireUserOrSuperAdmin;
