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
          service.qrCode = undefined; // Clear QR code when ready
          
          await WhatsappSession.update(
            { status: 'ready', lastActivity: new Date() },
            { where: { uuid } }
          );
          console.log(`WhatsApp client ${uuid} is ready!`);
          resolve({ status: 'ready' });
        });

        client.on('authenticated', async () => {
          // Keep QR code during authentication process
          await WhatsappSession.update(
            { status: 'authenticated' },
            { where: { uuid } }
          );
          console.log(`WhatsApp client ${uuid} authenticated, finalizing...`);
        });

        client.on('auth_failure', async () => {
          await WhatsappSession.update(
            { status: 'auth_failure' },
            { where: { uuid } }
          );
          this.sessions.delete(uuid);
        });

        client.on('disconnected', async (reason) => {
          try {
            console.log(`WhatsApp session ${uuid} disconnected. Reason:`, reason);
            
            // Update status in database
            await WhatsappSession.update(
              { status: 'disconnected' },
              { where: { uuid } }
            ).catch(err => console.error('Failed to update disconnect status:', err));
            
            // Clean up session data
            await this.cleanupDisconnectedSession(uuid);
            
            service.isReady = false;
            this.sessions.delete(uuid);
          } catch (error) {
            console.error(`Error handling disconnect for ${uuid}:`, error);
            // Ensure session is removed from memory even if cleanup fails
            this.sessions.delete(uuid);
          }
        });

        // Handle authentication failure
        client.on('auth_failure', async (message) => {
          try {
            console.log(`WhatsApp auth failure for ${uuid}:`, message);
            
            await WhatsappSession.update(
              { status: 'auth_failure' },
              { where: { uuid } }
            ).catch(err => console.error('Failed to update auth failure status:', err));
            
            // Clean up session data
            await this.cleanupDisconnectedSession(uuid);
            
            service.isReady = false;
            this.sessions.delete(uuid);
          } catch (error) {
            console.error(`Error handling auth failure for ${uuid}:`, error);
            // Ensure session is removed from memory even if cleanup fails
            this.sessions.delete(uuid);
          }
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
    
    if (service.client) {
      try {
        const state = await service.client.getState();
        
        switch (state) {
          case 'CONNECTED':
            return service.isReady ? 'ready' : 'authenticated';
          case 'OPENING':
            return service.qrCode ? 'qr' : 'initializing';
          case 'UNPAIRED':
          case 'UNLAUNCHED':
            return 'disconnected';
          default:
            // If we have QR code but not ready, keep showing QR
            if (service.qrCode && !service.isReady) {
              return 'qr';
            }
            return service.isReady ? 'ready' : 'initializing';
        }
      } catch (error) {
        console.error(`Error checking session state for ${uuid}:`, error);
        return 'disconnected';
      }
    }
    
    if (service.isReady) return 'ready';
    if (service.qrCode) return 'qr';
    return 'initializing';
  }

  async destroySession(uuid: string): Promise<void> {
    try {
      const service = this.sessions.get(uuid);
      if (service?.client) {
        try {
          // Gracefully destroy client
          await Promise.race([
            service.client.destroy(),
            new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
          ]);
        } catch (destroyError) {
          console.warn(`Error destroying client for ${uuid}:`, destroyError);
          // Continue with cleanup even if destroy fails
        }
      }
      
      this.sessions.delete(uuid);
      console.log(`Session ${uuid} destroyed successfully`);
    } catch (error) {
      console.error(`Error destroying session ${uuid}:`, error);
      // Remove from memory even if destroy failed
      this.sessions.delete(uuid);
    }
  }

  async cleanupDisconnectedSession(uuid: string): Promise<void> {
    try {
      // Delete session from database first
      await WhatsappSession.destroy({
        where: { uuid }
      });

      // Clean up session files with retry mechanism
      await this.cleanupSessionFiles(uuid);

      console.log(`Cleaned up disconnected session: ${uuid}`);
    } catch (error) {
      console.error('Error cleaning up session:', error);
      // Don't throw error, just log it to prevent server crash
    }
  }

  private async cleanupSessionFiles(uuid: string, retries: number = 3): Promise<void> {
    const sessionDir = path.join(this.sessionsDir, `.wwebjs_auth/session-${uuid}`);
    
    for (let i = 0; i < retries; i++) {
      try {
        if (fs.existsSync(sessionDir)) {
          // Force close any file handles first
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Use recursive force removal
          fs.rmSync(sessionDir, { 
            recursive: true, 
            force: true,
            maxRetries: 3,
            retryDelay: 500 
          });
          
          console.log(`Session files cleaned up: ${sessionDir}`);
          return;
        }
      } catch (error: any) {
        console.warn(`Cleanup attempt ${i + 1} failed for ${uuid}:`, error.message);
        
        if (i === retries - 1) {
          // Last attempt failed, log but don't crash
          console.error(`Failed to cleanup session files after ${retries} attempts: ${uuid}`);
          
          // Schedule cleanup for later
          setTimeout(() => {
            this.cleanupSessionFiles(uuid, 1).catch(err => 
              console.error(`Scheduled cleanup failed for ${uuid}:`, err.message)
            );
          }, 30000); // Try again in 30 seconds
        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        }
      }
    }
  }

  async checkSessionHealth(): Promise<void> {
    try {
      // Check all active sessions
      const sessionUUIDs = Array.from(this.sessions.keys());
      
      for (const uuid of sessionUUIDs) {
        try {
          const service = this.sessions.get(uuid);
          if (service?.client) {
            try {
              // Check with timeout to prevent hanging
              const statePromise = service.client.getState();
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('State check timeout')), 5000)
              );
              
              const state = await Promise.race([statePromise, timeoutPromise]) as string;
              
              if (state === 'UNPAIRED' || state === 'UNLAUNCHED') {
                console.log(`Session ${uuid} is unhealthy (${state}), cleaning up...`);
                await this.cleanupDisconnectedSession(uuid);
              }
            } catch (stateError) {
              console.log(`Session ${uuid} state check failed, cleaning up...`, stateError);
              await this.cleanupDisconnectedSession(uuid);
            }
          }
        } catch (sessionError) {
          console.error(`Error checking session ${uuid}:`, sessionError);
          // Try to cleanup problematic session
          try {
            await this.cleanupDisconnectedSession(uuid);
          } catch (cleanupError) {
            console.error(`Failed to cleanup problematic session ${uuid}:`, cleanupError);
          }
        }
      }
    } catch (error) {
      console.error('Session health check error:', error);
      // Don't crash the server, just log the error
    }
  }

  getQRCode(uuid: string): string | undefined {
    return this.sessions.get(uuid)?.qrCode;
  }
}

export default new WhatsAppManager();
