# WhatsApp OTP System

Sistem OTP (One-Time Password) menggunakan WhatsApp Web dengan React Vite dan Express.js yang dijadikan satu bundling.

## Fitur

1. **User Authentication**
   - Login system dengan JWT
   - Middleware untuk Superadmin/User

2. **Superadmin Features**
   - User Management (CRUD)
   - Change Password
   - Dashboard untuk monitoring

3. **User Features**
   - Generate QR Code WhatsApp
   - UUID Key untuk API
   - Session management WhatsApp
   - Send OTP via WhatsApp
   - Change Password

4. **WhatsApp Integration**
   - QR Code generation untuk linking device
   - Session dinamis berdasarkan UUID Key
   - Auto-regenerate session jika rusak dengan UUID yang sama
   - 6 digit OTP auto-generated

5. **API Endpoints**
   - Public endpoint untuk send dan verify OTP
   - UUID Key sebagai identifier

## Installation

### Prerequisites
- Node.js (v16 or higher)
- MySQL Database
- WhatsApp account

### Setup

1. Clone repository dan install dependencies:
```bash
git clone <repository-url>
cd OTP
npm run install:all
```

2. Setup database MySQL dan buat database:
```sql
CREATE DATABASE whatsapp_otp;
```

3. Configure environment variables di `server/.env`:
```env
# Database Configuration
MYSQL_URI=mysql://root:password@localhost:3306/whatsapp_otp

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production

# Default Admin Credentials
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=admin123
```

4. Jalankan aplikasi:
```bash
# Development mode (server + client)
npm run dev

# Production build
npm run build
npm start
```

## Usage

### Default Login
- **Email:** admin@example.com
- **Password:** admin123

### User Flow

1. **Login** dengan credentials
2. **Generate QR Code** untuk WhatsApp session
3. **Scan QR Code** dengan WhatsApp (Three dots → Linked devices → Link a device)
4. **Get UUID Key** untuk API integration
5. **Send OTP** via WhatsApp menggunakan phone number

### API Integration

#### Send OTP
```http
POST /api/session/send-otp
Content-Type: application/json
Authorization: Bearer <your-jwt-token>

{
  "phoneNumber": "6281234567890"
}
```

#### Verify OTP (Public)
```http
POST /api/session/verify-otp
Content-Type: application/json

{
  "phoneNumber": "6281234567890",
  "otpCode": "123456",
  "uuid": "your-uuid-key"
}
```

### Superadmin Features

- Access `/admin` untuk User Management
- Create, activate/deactivate users
- Monitor WhatsApp sessions
- Change passwords

## Project Structure

```
OTP/
├── package.json              # Root package.json
├── README.md
├── client/                   # React Vite Frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/         # React contexts
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
└── server/                   # Express.js Backend
    ├── src/
    │   ├── models/           # Sequelize models
    │   ├── routes/           # API routes
    │   ├── services/         # Business logic
    │   ├── middleware/       # Express middleware
    │   ├── db.ts            # Database connection
    │   └── index.ts         # Main server file
    ├── .env                 # Environment variables
    └── package.json
```

## Database Schema

### Users Table
- id (Primary Key)
- email (Unique)
- password (Hashed)
- role (superadmin/user)
- isActive (Boolean)
- timestamps

### WhatsApp Sessions Table
- id (Primary Key)
- uuid (Unique, API Key)
- userId (Foreign Key)
- sessionName (Unique per user)
- status (initializing/qr/authenticated/ready/disconnected/auth_failure)
- qrCode (Base64 image)
- lastActivity
- timestamps

### OTPs Table
- id (Primary Key)
- userId (Foreign Key)
- phoneNumber
- otpCode (6 digits)
- uuid (Session identifier)
- isUsed (Boolean)
- expiresAt (5 minutes)
- timestamps

## Security Features

- JWT authentication
- Password hashing dengan bcrypt
- Role-based access control
- OTP expiration (5 minutes)
- Session management
- Input validation

## Development

```bash
# Install dependencies
npm run install:all

# Run development mode
npm run dev

# Build for production
npm run build

# Run production
npm start
```

## Production Deployment

1. Build aplikasi:
```bash
npm run build
```

2. Set environment ke production di `server/.env`:
```env
NODE_ENV=production
```

3. Jalankan server:
```bash
npm start
```

4. Server akan serve React build files secara statis dan API endpoints.

## Troubleshooting

### WhatsApp Session Issues
- Jika QR Code tidak muncul, regenerate session
- Jika session disconnected, scan ulang QR code
- UUID key tetap sama meskipun session di-regenerate

### Database Issues
- Pastikan MySQL service berjalan
- Check connection string di `.env`
- Database akan auto-create tables saat startup

### API Issues
- Pastikan WhatsApp session status "ready"
- Check UUID key validity
- Verify phone number format (6281234567890)

## License

Private Project - All Rights Reserved
