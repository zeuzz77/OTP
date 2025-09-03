"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
const User_1 = __importDefault(require("./User"));
class Otp extends sequelize_1.Model {
    isExpired() {
        return new Date() > this.expiresAt;
    }
    isValid() {
        return !this.isUsed && !this.isExpired();
    }
}
Otp.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User_1.default,
            key: 'id'
        }
    },
    phoneNumber: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
    },
    otpCode: {
        type: sequelize_1.DataTypes.STRING(6),
        allowNull: false,
    },
    uuid: {
        type: sequelize_1.DataTypes.STRING(36),
        allowNull: false,
    },
    isUsed: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    expiresAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
}, {
    sequelize: db_1.sequelize,
    modelName: 'Otp',
    tableName: 'otps',
    timestamps: true,
    indexes: [
        {
            fields: ['phoneNumber']
        },
        {
            fields: ['uuid']
        },
        {
            fields: ['otpCode']
        },
        {
            fields: ['expiresAt']
        }
    ]
});
// Associations
Otp.belongsTo(User_1.default, { foreignKey: 'userId', as: 'user' });
User_1.default.hasMany(Otp, { foreignKey: 'userId', as: 'otps' });
exports.default = Otp;
