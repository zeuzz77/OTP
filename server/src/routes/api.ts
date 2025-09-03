import express from 'express';
import WhatsappSession from '../models/WhatsappSession';
import WhatsAppManager from '../services/whatsappService';
import OtpService from '../services/otpService';
import Otp from '../models/Otp';

const router = express.Router();
const whatsappManager = WhatsAppManager.getInstance();

// Open API: Send OTP (Public endpoint with UUID authentication)
router.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber, uuid, otp, message } = req.body;

    if (!phoneNumber || !uuid) {
      return res.status(400).json({ 
        error: 'Phone number and UUID are required',
        example: {
          phoneNumber: "6281234567890",
          uuid: "66fd9da1-a1fa-4799-8dfd-57cf01becef7",
          otp: "",
          message: ""
        }
      });
    }

    // Verify UUID exists and session is ready
    const session = await WhatsappSession.findOne({
      where: { uuid }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found with provided UUID' });
    }

    const sessionStatus = await whatsappManager.getSessionStatus(uuid);
    if (sessionStatus !== 'ready') {
      return res.status(400).json({ 
        error: `WhatsApp session not ready. Current status: ${sessionStatus}` 
      });
    }

    // Generate OTP if not provided
    const otpCode = otp && otp.trim() ? otp.trim() : OtpService.generateOTP();

    // Use default message if not provided
    const otpMessage = message && message.trim() 
      ? message.trim() 
      : `🔐 Kode OTP Anda: ${otpCode}\n\nKode ini berlaku selama 5 menit.\nJangan bagikan kode ini kepada siapapun.`;

    // Send message via WhatsApp
    const sent = await whatsappManager.sendMessage(uuid, phoneNumber, otpMessage);

    if (sent) {
      // Save OTP to database if it was auto-generated
      if (!otp || !otp.trim()) {
        await Otp.create({
          user_id: session.user_id,
          phone: phoneNumber,
          otp_code: otpCode,
          uuid,
          sent_status: 1
        });
      }

      res.json({
        success: true,
        message: 'OTP sent successfully',
        data: {
          phoneNumber,
          uuid,
          otpCode: process.env.NODE_ENV === 'development' ? otpCode : undefined,
          messageTemplate: otpMessage,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send message via WhatsApp'
      });
    }
  } catch (error) {
    console.error('Open API Send OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check session status by UUID (Public endpoint)
router.post('/status', async (req, res) => {
  try {
    const { uuid } = req.body;

    if (!uuid) {
      return res.status(400).json({ error: 'UUID is required' });
    }

    // Check if session exists in database
    const session = await WhatsappSession.findOne({
      where: { uuid }
    });

    if (!session) {
      return res.json({ 
        exists: false,
        status: 'not_found',
        message: 'Session not found'
      });
    }

    // Get current status from WhatsApp Manager
    let currentStatus = 'unknown';
    let isConnected = false;
    
    try {
      currentStatus = await whatsappManager.getSessionStatus(uuid);
      isConnected = currentStatus === 'ready';
      
      // Update database status if different
      if (currentStatus !== session.status) {
        await session.update({ status: currentStatus as any });
      }
    } catch (statusError) {
      console.error(`Error getting status for ${uuid}:`, statusError);
      currentStatus = 'error';
    }

    res.json({
      exists: true,
      uuid: session.uuid,
      status: currentStatus,
      isConnected,
      lastActivity: session.lastActivity,
      userId: session.user_id
    });
  } catch (error) {
    console.error('Check session status error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      exists: false,
      status: 'error'
    });
  }
});


export default router;
