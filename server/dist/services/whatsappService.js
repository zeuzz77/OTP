"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const whatsapp_web_js_1 = require("whatsapp-web.js");
const qrcode_1 = __importDefault(require("qrcode"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const WhatsappSession_1 = __importDefault(require("../models/WhatsappSession"));
class WhatsAppManager {
    constructor() {
        this.sessions = new Map();
        this.sessionsDir = path_1.default.join(__dirname, '../../sessions');
        if (!fs_1.default.existsSync(this.sessionsDir)) {
            fs_1.default.mkdirSync(this.sessionsDir, { recursive: true });
        }
    }
    async initializeSession(uuid, sessionName) {
        try {
            const existingService = this.sessions.get(uuid);
            if (existingService?.isReady) {
                return { status: 'ready' };
            }
            // Create session directory
            const sessionPath = path_1.default.join(this.sessionsDir, sessionName);
            if (!fs_1.default.existsSync(sessionPath)) {
                fs_1.default.mkdirSync(sessionPath, { recursive: true });
            }
            const client = new whatsapp_web_js_1.Client({
                authStrategy: new whatsapp_web_js_1.LocalAuth({
                    clientId: sessionName,
                    dataPath: sessionPath
                }),
                puppeteer: {
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                }
            });
            const service = {
                client,
                isReady: false
            };
            this.sessions.set(uuid, service);
            return new Promise((resolve) => {
                client.on('qr', async (qr) => {
                    try {
                        const qrCodeDataURL = await qrcode_1.default.toDataURL(qr);
                        service.qrCode = qrCodeDataURL;
                        // Update database
                        await WhatsappSession_1.default.update({ status: 'qr', qrCode: qrCodeDataURL }, { where: { uuid } });
                        resolve({ qrCode: qrCodeDataURL, status: 'qr' });
                    }
                    catch (error) {
                        console.error('QR Code generation error:', error);
                        resolve({ status: 'error' });
                    }
                });
                client.on('ready', async () => {
                    service.isReady = true;
                    await WhatsappSession_1.default.update({ status: 'ready', lastActivity: new Date() }, { where: { uuid } });
                    console.log(`WhatsApp client ${sessionName} is ready!`);
                });
                client.on('authenticated', async () => {
                    await WhatsappSession_1.default.update({ status: 'authenticated' }, { where: { uuid } });
                });
                client.on('auth_failure', async () => {
                    await WhatsappSession_1.default.update({ status: 'auth_failure' }, { where: { uuid } });
                    this.sessions.delete(uuid);
                });
                client.on('disconnected', async () => {
                    await WhatsappSession_1.default.update({ status: 'disconnected' }, { where: { uuid } });
                    service.isReady = false;
                });
                client.initialize();
                // Timeout after 30 seconds if no QR code is generated
                setTimeout(() => {
                    if (!service.qrCode && !service.isReady) {
                        resolve({ status: 'timeout' });
                    }
                }, 30000);
            });
        }
        catch (error) {
            console.error('Session initialization error:', error);
            return { status: 'error' };
        }
    }
    async sendMessage(uuid, phoneNumber, message) {
        try {
            const service = this.sessions.get(uuid);
            if (!service?.isReady || !service.client) {
                return false;
            }
            // Format phone number (add country code if missing)
            let formattedNumber = phoneNumber.replace(/\D/g, '');
            if (!formattedNumber.startsWith('62')) {
                formattedNumber = '62' + formattedNumber.replace(/^0/, '');
            }
            const chatId = formattedNumber + '@c.us';
            await service.client.sendMessage(chatId, message);
            // Update last activity
            await WhatsappSession_1.default.update({ lastActivity: new Date() }, { where: { uuid } });
            return true;
        }
        catch (error) {
            console.error('Send message error:', error);
            return false;
        }
    }
    async getSessionStatus(uuid) {
        const service = this.sessions.get(uuid);
        if (!service)
            return 'disconnected';
        if (service.isReady)
            return 'ready';
        return 'initializing';
    }
    async destroySession(uuid) {
        const service = this.sessions.get(uuid);
        if (service?.client) {
            await service.client.destroy();
        }
        this.sessions.delete(uuid);
    }
    getQRCode(uuid) {
        return this.sessions.get(uuid)?.qrCode;
    }
}
exports.default = new WhatsAppManager();
