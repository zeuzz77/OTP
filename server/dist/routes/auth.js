"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const user = await User_1.default.findOne({ where: { username, active: 1 } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET || 'fallback', { expiresIn: '24h' });
        res.json({
            token,
            user: user.toJSON()
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get current user profile
router.get('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        res.json({ user: req.user.toJSON() });
    }
    catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Change password
router.put('/change-password', auth_1.authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new passwords are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }
        const user = await User_1.default.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isValidCurrentPassword = await user.comparePassword(currentPassword);
        if (!isValidCurrentPassword) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        await user.update({ password: newPassword });
        res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// User management (Superadmin only)
router.get('/users', auth_1.authenticateToken, auth_1.requireSuperAdmin, async (req, res) => {
    try {
        const users = await User_1.default.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json({ users });
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create user (Superadmin only)
router.post('/users', auth_1.authenticateToken, auth_1.requireSuperAdmin, async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        const existingUser = await User_1.default.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this username already exists' });
        }
        const user = await User_1.default.create({
            username,
            password,
            role: role || 'user',
            active: true
        });
        res.status(201).json({
            message: 'User created successfully',
            user: user.toJSON()
        });
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update user (Superadmin only)
router.put('/users/:id', auth_1.authenticateToken, auth_1.requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, role, active } = req.body;
        const user = await User_1.default.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const updateData = {};
        if (username)
            updateData.username = username;
        if (role)
            updateData.role = role;
        if (typeof active === 'boolean')
            updateData.active = active;
        await user.update(updateData);
        res.json({
            message: 'User updated successfully',
            user: user.toJSON()
        });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Reset user password (Superadmin only)
router.put('/users/:id/reset-password', auth_1.authenticateToken, auth_1.requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }
        const user = await User_1.default.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        await user.update({ password: newPassword });
        res.json({ message: 'Password reset successfully' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
