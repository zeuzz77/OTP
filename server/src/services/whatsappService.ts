import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import WhatsappSession from '../models/WhatsappSession';

interface WhatsAppService {
  client?: Client;
  isReady: boolean;
  qrCode?: string;
}

class WhatsAppManager {
  private sessions: Map<string, WhatsAppService> = new Map();
  private sessionsDir = path.join(__dirname, '../../sessions');

  constructor() {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  async initializeSession(uuid: string): Promise<{ qrCode?: string; status: string }> {
    try {
      const existingService = this.sessions.get(uuid);
      if (existingService?.isReady) {
        return { status: 'ready' };
      }

      // Create session directory
      const sessionPath = path.join(this.sessionsDir);
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
      }

      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: uuid,
          dataPath: sessionPath
        }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      });

      const service: WhatsAppService = {
        client,
        isReady: false
      };

      this.sessions.set(uuid, service);

      return new Promise((resolve) => {
        client.on('qr', async (qr) => {
          try {
            const qrCodeDataURL = await QRCode.toDataURL(qr);
            service.qrCode = qrCodeDataURL;
            
            // Update database
            await WhatsappSession.update(
              { status: 'qr', qrCode: qrCodeDataURL },
              { where: { uuid } }
            );

            resolve({ qrCode: qrCodeDataURL, status: 'qr' });
          } catch (error) {
            console.error('QR Code generation error:', error);
            resolve({ status: 'error' });
          }
        });

        client.on('ready', async () => {
          service.isReady = true;
          await WhatsappSession.update(
            { status: 'ready', lastActivity: new Date() },
            { where: { uuid } }
          );
          console.log(`WhatsApp client ${uuid} is ready!`);
          await WhatsappSession.update(
              { status: 'ready' },
              { where: { uuid } }
            );
          resolve({ status: 'ready' });

        });

        client.on('authenticated', async () => {
          await WhatsappSession.update(
            { status: 'authenticated' },
            { where: { uuid } }
          );
        });

        client.on('auth_failure', async () => {
          await WhatsappSession.update(
            { status: 'auth_failure' },
            { where: { uuid } }
          );
          this.sessions.delete(uuid);
        });

        client.on('disconnected', async () => {
          await WhatsappSession.update(
            { status: 'disconnected' },
            { where: { uuid } }
          );
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
    } catch (error) {
      console.error('Session initialization error:', error);
      return { status: 'error' };
    }
  }

  async sendMessage(uuid: string, phoneNumber: string, message: string): Promise<boolean> {
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
      await WhatsappSession.update(
        { lastActivity: new Date() },
        { where: { uuid } }
      );

      return true;
    } catch (error) {
      console.error('Send message error:', error);
      return false;
    }
  }

  async getSessionStatus(uuid: string): Promise<string> {
    const service = this.sessions.get(uuid);
    if (!service) return 'disconnected';
    if (service.isReady) return 'ready';
    return 'initializing';
  }

  async destroySession(uuid: string): Promise<void> {
    const service = this.sessions.get(uuid);
    if (service?.client) {
      await service.client.destroy();
    }
    this.sessions.delete(uuid);
  }

  getQRCode(uuid: string): string | undefined {
    return this.sessions.get(uuid)?.qrCode;
  }
}

export default new WhatsAppManager();
