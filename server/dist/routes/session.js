"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const WhatsappSession_1 = __importDefault(require("../models/WhatsappSession"));
const whatsappService_1 = __importDefault(require("../services/whatsappService"));
const otpService_1 = __importDefault(require("../services/otpService"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get user's WhatsApp session
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const session = await WhatsappSession_1.default.findOne({
            where: { user_id: req.user.id }
        });
        if (!session) {
            return res.json({ session: null });
        }
        const currentStatus = await whatsappService_1.default.getSessionStatus(session.uuid);
        // Update status if different
        if (currentStatus !== session.status) {
            await session.update({ status: currentStatus });
        }
        const qrCode = currentStatus === 'qr' ? whatsappService_1.default.getQRCode(session.uuid) : null;
        res.json({
            session: {
                uuid: session.uuid,
                sessionName: session.sessionName,
                status: currentStatus,
                qrCode,
                lastActivity: session.lastActivity
            }
        });
    }
    catch (error) {
        console.error('Get session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Generate new WhatsApp session with QR Code
router.post('/generate', auth_1.authenticateToken, async (req, res) => {
    try {
        let session = await WhatsappSession_1.default.findOne({
            where: { user_id: req.user.id }
        });
        let uuid;
        let sessionName;
        if (session) {
            // Reuse existing UUID but regenerate session
            uuid = session.uuid;
            sessionName = session.sessionName;
            // Destroy existing session if any
            await whatsappService_1.default.destroySession(uuid);
            // Update status to initializing
            await session.update({
                status: 'initializing',
                qrCode: null,
                lastActivity: new Date()
            });
        }
        else {
            // Create new session
            uuid = (0, uuid_1.v4)();
            sessionName = `session_${req.user.id}_${uuid.replace(/-/g, '')}`;
            session = await WhatsappSession_1.default.create({
                uuid,
                userId: req.user.id,
                sessionName,
                status: 'initializing'
            });
        }
        // Initialize WhatsApp session
        const result = await whatsappService_1.default.initializeSession(uuid, sessionName);
        res.json({
            uuid,
            sessionName,
            status: result.status,
            qrCode: result.qrCode
        });
    }
    catch (error) {
        console.error('Generate session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Send OTP
router.post('/send-otp', auth_1.authenticateToken, async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }
        const session = await WhatsappSession_1.default.findOne({
            where: { user_id: req.user.id }
        });
        if (!session) {
            return res.status(400).json({ error: 'No WhatsApp session found. Please generate QR code first.' });
        }
        const result = await otpService_1.default.createAndSendOTP(req.user.id, phoneNumber, session.uuid);
        res.json(result);
    }
    catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Verify OTP (Public endpoint)
router.post('/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, otpCode, uuid } = req.body;
        if (!phoneNumber || !otpCode || !uuid) {
            return res.status(400).json({ error: 'Phone number, OTP code, and UUID are required' });
        }
        const result = await otpService_1.default.verifyOTP(phoneNumber, otpCode, uuid);
        res.json(result);
    }
    catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
