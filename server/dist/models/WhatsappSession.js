"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
const User_1 = __importDefault(require("./User"));
class WhatsappSession extends sequelize_1.Model {
}
WhatsappSession.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    uuid: {
        type: sequelize_1.DataTypes.STRING(36),
        allowNull: false,
        unique: true,
    },
    user_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User_1.default,
            key: 'id'
        }
    },
    sessionName: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('initializing', 'qr', 'authenticated', 'ready', 'disconnected', 'auth_failure'),
        allowNull: false,
        defaultValue: 'initializing',
    },
    qrCode: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    lastActivity: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize: db_1.sequelize,
    modelName: 'WhatsappSession',
    tableName: 'whatsapp_sessions',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['uuid']
        },
        {
            fields: ['user_id']
        },
        {
            fields: ['status']
        }
    ]
});
// Associations
WhatsappSession.belongsTo(User_1.default, { foreignKey: 'user_id', as: 'user' });
User_1.default.hasMany(WhatsappSession, { foreignKey: 'user_id', as: 'whatsappSessions' });
exports.default = WhatsappSession;
