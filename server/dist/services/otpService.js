"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Otp_1 = __importDefault(require("../models/Otp"));
const whatsappService_1 = __importDefault(require("./whatsappService"));
class OtpService {
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async createAndSendOTP(userId, phoneNumber, uuid) {
        try {
            // Check if WhatsApp session is ready
            const sessionStatus = await whatsappService_1.default.getSessionStatus(uuid);
            if (sessionStatus !== 'ready') {
                return {
                    success: false,
                    message: `WhatsApp session not ready. Status: ${sessionStatus}`
                };
            }
            // Generate OTP
            const otpCode = this.generateOTP();
            // Set expiration time (5 minutes from now)
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 5);
            // Save OTP to database
            await Otp_1.default.create({
                userId,
                phoneNumber,
                otpCode,
                uuid,
                isUsed: false,
                expiresAt
            });
            // Send OTP via WhatsApp
            const message = `🔐 Kode OTP Anda: ${otpCode}\n\nKode ini berlaku selama 5 menit.\nJangan bagikan kode ini kepada siapapun.`;
            const sent = await whatsappService_1.default.sendMessage(uuid, phoneNumber, message);
            if (sent) {
                return {
                    success: true,
                    message: 'OTP sent successfully',
                    otpCode: process.env.NODE_ENV === 'development' ? otpCode : undefined
                };
            }
            else {
                return {
                    success: false,
                    message: 'Failed to send OTP via WhatsApp'
                };
            }
        }
        catch (error) {
            console.error('OTP creation/sending error:', error);
            return {
                success: false,
                message: 'Internal server error'
            };
        }
    }
    async verifyOTP(phoneNumber, otpCode, uuid) {
        try {
            const otp = await Otp_1.default.findOne({
                where: {
                    phoneNumber,
                    otpCode,
                    uuid,
                    isUsed: false
                },
                order: [['createdAt', 'DESC']]
            });
            if (!otp) {
                return {
                    success: false,
                    message: 'Invalid OTP code'
                };
            }
            if (otp.isExpired()) {
                return {
                    success: false,
                    message: 'OTP code has expired'
                };
            }
            // Mark OTP as used
            await otp.update({ isUsed: true });
            return {
                success: true,
                message: 'OTP verified successfully'
            };
        }
        catch (error) {
            console.error('OTP verification error:', error);
            return {
                success: false,
                message: 'Internal server error'
            };
        }
    }
    async cleanupExpiredOTPs() {
        try {
            await Otp_1.default.destroy({
                where: {
                    expiresAt: {
                        [sequelize_1.Op.lt]: new Date()
                    }
                }
            });
        }
        catch (error) {
            console.error('OTP cleanup error:', error);
        }
    }
}
exports.default = new OtpService();
