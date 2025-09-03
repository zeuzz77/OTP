import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import sessionRouter from "./routes/session";
import authRouter from "./routes/auth";
import apiRouter from "./routes/api";
import WhatsAppManager from "./services/whatsappService";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

app.use(express.json());
if (NODE_ENV === "development") app.use(cors({ origin: ["http://localhost:5173", "http://localhost:5174"] })); // Vite dev

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/session", sessionRouter);
app.use("/api", apiRouter);

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend connection successful!", timestamp: new Date().toISOString() });
});

// Serve React build (static files)
const clientDistPath = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDistPath));

// Serve React app for all non-API routes
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

(async () => {
  try {    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      
      // Start health check for WhatsApp sessions every 5 minutes
      setInterval(async () => {
        try {
          console.log('🔍 Running WhatsApp session health check...');
          await WhatsAppManager.checkSessionHealth();
        } catch (healthCheckError) {
          console.error('Health check failed:', healthCheckError);
          // Don't crash server, just log the error
        }
      }, 5 * 60 * 1000); // 5 minutes
      
      // Handle uncaught exceptions gracefully
      process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        // Don't exit process, just log the error
      });
      
      process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        // Don't exit process, just log the error
      });
    });
  } catch (err) {
    console.error("Server startup error:", err);
    process.exit(1);
  }
})();
