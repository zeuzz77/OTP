"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = void 0;
exports.assertDbConnectionOk = assertDbConnectionOk;
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const uri = process.env.MYSQL_URI;
if (!uri)
    throw new Error("Missing MYSQL_URI in env");
exports.sequelize = new sequelize_1.Sequelize(uri, {
    dialect: "mysql",
    logging: false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
});
// optional: test connection on startup (called from index.ts)
async function assertDbConnectionOk() {
    await exports.sequelize.authenticate();
    console.log("✅ DB connection OK");
}
