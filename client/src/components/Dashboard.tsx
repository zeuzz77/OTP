import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
interface WhatsAppSession {
  uuid: string;
  sessionName: string;
  status: string;
  qrCode?: string;
  lastActivity?: string;
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchSession();
  }, []);

  // Polling untuk monitor status session
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    // Monitor session even when ready (to detect disconnects)
    if (session) {
      intervalId = setInterval(async () => {
        try {
          const response = await axios.get('/api/session');
          
          // Handle disconnect notification
          if (response.data.disconnected) {
            setSession(null);
            setMessage(`🔴 ${response.data.reason}. Session has been cleaned up. Please generate a new QR code to reconnect.`);
            return;
          }
          
          const updatedSession = response.data.session;
          
          if (updatedSession) {
            const previousStatus = session.status;
            
            // Preserve QR code if status is still initializing
            const updatedSessionWithQR = {
              ...updatedSession,
              qrCode: updatedSession.status === 'initializing' && session.qrCode 
                ? session.qrCode 
                : updatedSession.qrCode
            };
            
            setSession(prevSession => ({
              ...prevSession,
              ...updatedSessionWithQR
            }));
            
            // Berikan notifikasi berdasarkan perubahan status
            if (updatedSession.status !== previousStatus) {
              switch (updatedSession.status) {
                case 'ready':
                  setMessage('✅ WhatsApp connected successfully! You can now send OTP messages.');
                  break;
                case 'authenticated':
                  setMessage('🔐 WhatsApp authenticated. Finalizing connection...');
                  break;
                case 'disconnected':
                  setMessage('❌ WhatsApp disconnected. Please scan QR code again.');
                  break;
                case 'auth_failure':
                  setMessage('⚠️ Authentication failed. Please regenerate QR code.');
                  break;
                case 'initializing':
                  if (previousStatus === 'qr') {
                    setMessage('🔄 Initializing WhatsApp session. Please keep the QR code visible.');
                  }
                  break;
              }
            }
          } else {
            // Session was deleted (cleanup happened)
            setSession(null);
            setMessage('🔴 WhatsApp session expired or disconnected. Please generate a new QR code.');
          }
        } catch (error) {
          console.error('Failed to fetch session status:', error);
        }
      }, session.status === 'ready' ? 10000 : 3000); // Poll less frequently when ready
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [session?.uuid, session?.status]);

  const fetchSession = async () => {
    try {
      const response = await axios.get('/api/session');
      
      // Handle disconnect notification
      if (response.data.disconnected) {
        setSession(null);
        setMessage(`🔴 ${response.data.reason}. Please generate a new QR code to reconnect.`);
        return;
      }
      
      setSession(response.data.session);
    } catch (error) {
      console.error('Failed to fetch session:', error);
    }
  };

  const generateQRCode = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await axios.post('/api/session/generate');
      setSession({
        uuid: response.data.uuid,
        sessionName: response.data.sessionName,
        status: response.data.status,
        qrCode: response.data.qrCode
      });
      setMessage('QR Code generated successfully!');
    } catch (error) {
      setMessage('Failed to generate QR Code');
      console.error('QR generation failed:', error);
    }
    
    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage('New password must be at least 6 characters long');
      return;
    }

    try {
      await axios.put('/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setMessage('Password changed successfully!');
      setShowChangePassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to change password');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-600';
      case 'qr': return 'text-orange-600';
      case 'authenticated': return 'text-blue-600';
      case 'disconnected': return 'text-red-600';
      case 'auth_failure': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-whatsapp-secondary">
              WhatsApp OTP Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.username}</span>
              {user?.role === 'superadmin' && (
                <Link 
                  to="/admin" 
                  className="bg-whatsapp-primary hover:bg-whatsapp-secondary text-white px-4 py-2 rounded-md text-sm font-medium transition duration-200"
                >
                  Admin Panel
                </Link>
              )}
              <button 
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {message && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {message}
          </div>
        )}

        {/* WhatsApp Session Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-whatsapp-secondary mb-4 pb-2 border-b-2 border-whatsapp-primary">
            WhatsApp Session
          </h2>
          
          {session ? (
            <div className="bg-gray-50 p-4 rounded-md mb-4">
                <p className="mb-2 flex items-center gap-2">
                <strong>UUID:</strong>
                <span className="font-mono text-sm">{session.uuid}</span>
                <button
                    type="button"
                    onClick={() => {
                    navigator.clipboard.writeText(session.uuid);
                    }}
                    className="ml-2 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition"
                    title="Copy UUID"
                >
                    Copy
                </button>
                </p>
                <p className="mb-2">
                    <strong>Status:</strong> 
                    <span className={`ml-2 font-semibold ${getStatusColor(session.status)}`}>
                    {session.status.toUpperCase()}
                    </span>
                </p>
                {session.lastActivity && (
                    <p><strong>Last Activity:</strong> {new Date(session.lastActivity).toLocaleString()}</p>
                )}
            </div>
          ) : (
            <p className="text-gray-600 mb-4">No active session found.</p>
          )}

          {(!session || !['ready', 'initializing', 'qr'].includes(session.status)) && (
            <button 
                onClick={generateQRCode} 
                disabled={loading}
                className="flex items-center justify-center space-x-2 bg-whatsapp-primary hover:bg-whatsapp-secondary text-white px-6 py-2 rounded-md font-medium transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                {loading && (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                )}
                <span>{loading ? 'Generating...' : (session ? 'Reconnect' : 'Generate QR Code')}</span>
            </button>
            )}

          {session?.qrCode && (
            <div className="mt-6 text-center">
              <h3 className="text-lg font-medium mb-3">Scan this QR Code with WhatsApp:</h3>
              <div className="bg-gray-50 p-4 rounded-lg inline-block">
                <img src={session.qrCode} alt="WhatsApp QR Code" className="max-w-xs h-auto border rounded" />
              </div>
              <p className="mt-3 text-sm text-gray-600">
                Open WhatsApp → Three dots → Linked devices → Link a device
              </p>
            </div>
          )}
          {session?.status == 'ready' && (
            <div className="mt-6 space-y-4">
              {/* Open API Information */}
              <div className="bg-green-50 p-4 rounded-md border border-green-200">
                <h3 className="font-medium text-green-900 mb-2">Open API (Public Access):</h3>
                <div className="text-sm space-y-2 text-green-800">
                    <p>Use the following endpoint to send OTP messages via WhatsApp:</p>                 
                  <div className="border-t border-green-200 pt-2">
                    <p><strong>Send OTP :</strong> <span className="font-mono">POST /api/send-otp</span></p>
                    <div className="mt-1 p-2 bg-green-100 rounded text-xs font-mono">
                      {JSON.stringify({
                        phoneNumber: "6281234567890",
                        uuid: session.uuid,
                        otp: "",
                        message: ""
                      }, null, 2)}
                    </div>
                    <p className="mt-1 text-xs">
                      • <strong>phoneNumber:</strong> Target phone number with country code<br/>
                      • <strong>uuid:</strong> Your session UUID<br/>
                      • <strong>otp:</strong> Custom OTP (leave empty for auto-generation)<br/>
                      • <strong>message:</strong> Custom message (leave empty for default template)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-whatsapp-secondary mb-4 pb-2 border-b-2 border-whatsapp-primary">
            Settings
          </h2>
          
          <button 
            onClick={() => setShowChangePassword(!showChangePassword)}
            className="bg-whatsapp-primary hover:bg-whatsapp-secondary text-white px-6 py-2 rounded-md font-medium transition duration-200"
          >
            Change Password
          </button>

          {showChangePassword && (
            <form onSubmit={handleChangePassword} className="mt-4 bg-gray-50 p-4 rounded-md">
              <h3 className="text-lg font-medium text-whatsapp-secondary mb-4">Change Password</h3>
              <div className="space-y-4">
                <input
                  type="password"
                  placeholder="Current Password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-whatsapp-primary focus:border-transparent"
                />
                <input
                  type="password"
                  placeholder="New Password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-whatsapp-primary focus:border-transparent"
                />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-whatsapp-primary focus:border-transparent"
                />
                <div className="flex space-x-4">
                  <button 
                    type="submit"
                    className="bg-whatsapp-primary hover:bg-whatsapp-secondary text-white px-4 py-2 rounded-md font-medium transition duration-200"
                  >
                    Update Password
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowChangePassword(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium transition duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
