"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./db");
const session_1 = __importDefault(require("./routes/session"));
const auth_1 = __importDefault(require("./routes/auth"));
const WhatsappSession_1 = __importDefault(require("./models/WhatsappSession"));
const User_1 = __importDefault(require("./models/User"));
const Otp_1 = __importDefault(require("./models/Otp"));
const otpService_1 = __importDefault(require("./services/otpService"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
app.use(express_1.default.json());
if (NODE_ENV === "development")
    app.use((0, cors_1.default)({ origin: "http://localhost:5173" })); // Vite dev
// API Routes
app.use("/api/auth", auth_1.default);
app.use("/api/session", session_1.default);
// Serve React build (static files)
const clientDistPath = path_1.default.join(__dirname, "../../client/dist");
app.use(express_1.default.static(clientDistPath));
// Serve React app for all non-API routes
app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path_1.default.join(clientDistPath, "index.html"));
});
(async () => {
    try {
        // Test database connection
        await (0, db_1.assertDbConnectionOk)();
        // Sync models
        await User_1.default.sync({ alter: NODE_ENV === 'development' });
        await WhatsappSession_1.default.sync({ alter: NODE_ENV === 'development' });
        await Otp_1.default.sync({ alter: NODE_ENV === 'development' });
        // Create default superadmin if not exists
        const adminExists = await User_1.default.findOne({ where: { role: 'superadmin' } });
        if (!adminExists) {
            await User_1.default.create({
                email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com',
                password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
                role: 'superadmin',
                isActive: true
            });
            console.log('✅ Default superadmin created');
        }
        // Start cleanup service for expired OTPs
        setInterval(() => {
            otpService_1.default.cleanupExpiredOTPs();
        }, 5 * 60 * 1000); // Every 5 minutes
        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    }
    catch (err) {
        console.error("Server startup error:", err);
        process.exit(1);
    }
})();
