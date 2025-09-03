import Otp from '../models/Otp';
import WhatsAppManager from './whatsappService';

const whatsappManager = WhatsAppManager.getInstance();

class OtpService {
  
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  generateOTP(): string {
    return OtpService.generateOTP();
  }

  async createAndSendOTP(
    userId: number,
    phoneNumber: string,
    uuid: string
  ): Promise<{ success: boolean; message: string; otpCode?: string }> {
    try {
      // Check if WhatsApp session is ready
      const sessionStatus = await whatsappManager.getSessionStatus(uuid);
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
      await Otp.create({
        user_id : userId,
        phone: phoneNumber,
        otp_code: otpCode,
        uuid,
        sent_status: 0
      });

      // Send OTP via WhatsApp
      const message = `🔐 Kode OTP Anda: ${otpCode}\n\nKode ini berlaku selama 5 menit.\nJangan bagikan kode ini kepada siapapun.`;
      
      const sent = await whatsappManager.sendMessage(uuid, phoneNumber, message);
      
      if (sent) {
        return {
          success: true,
          message: 'OTP sent successfully',
          otpCode: process.env.NODE_ENV === 'development' ? otpCode : undefined
        };
      } else {
        return {
          success: false,
          message: 'Failed to send OTP via WhatsApp'
        };
      }
    } catch (error) {
      console.error('OTP creation/sending error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }
}

export default new OtpService();
