import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import WhatsappSession from '../models/WhatsappSession';
import WhatsAppManager from '../services/whatsappService';
import OtpService from '../services/otpService';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get user's WhatsApp session
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const session = await WhatsappSession.findOne({
      where: { user_id: req.user.id }
    });

    if (!session) {
      return res.json({ session: null });
    }

    const currentStatus = await WhatsAppManager.getSessionStatus(session.uuid);
    
    // Update status if different
    if (currentStatus !== session.status) {
      await session.update({ status: currentStatus as any });
    }

    const qrCode = currentStatus === 'qr' ? WhatsAppManager.getQRCode(session.uuid) : null;

    res.json({
      session: {
        uuid: session.uuid,
        status: currentStatus,
        qrCode,
        lastActivity: session.lastActivity
      }
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate new WhatsApp session with QR Code
router.post('/generate', authenticateToken, async (req: any, res) => {
  try {
    let session = await WhatsappSession.findOne({
      where: { user_id: req.user.id }
    });

    let uuid: string;
    let sessionName: string;

    if (session) {
      uuid = session.uuid;      
      await WhatsAppManager.destroySession(uuid);
      await session.update({ 
        status: 'initializing',
        qrCode: null as any,
        lastActivity: new Date()
      });
    } else {
      uuid = uuidv4();
      sessionName = `session_${req.user.id}_${uuid.replace(/-/g, '')}`;
      
      session = await WhatsappSession.create({
        uuid,
        user_id: req.user.id,
        sessionName,
        status: 'initializing'
      } as any);
    }

    const result = await WhatsAppManager.initializeSession(uuid);

    res.json({
      uuid,
      status: result.status,
      qrCode: result.qrCode
    });
  } catch (error) {
    console.error('Generate session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send OTP (Protected - for authenticated users)
router.post('/send-otp', authenticateToken, async (req: any, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const session = await WhatsappSession.findOne({
      where: { user_id: req.user.id }
    });

    if (!session) {
      return res.status(400).json({ error: 'No WhatsApp session found. Please generate QR code first.' });
    }

    const result = await OtpService.createAndSendOTP(
      req.user.id,
      phoneNumber,
      session.uuid
    );

    res.json(result);
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
