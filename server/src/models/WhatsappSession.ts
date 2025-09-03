import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../db';
import User from './User';

interface WhatsappSessionAttributes {
  id: number;
  uuid: string;
  user_id: number;
  status: 'initializing' | 'qr' | 'authenticated' | 'ready' | 'disconnected' | 'auth_failure';
  qrCode?: string;
  lastActivity?: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface WhatsappSessionCreationAttributes extends Optional<WhatsappSessionAttributes, 'id' | 'created_at' | 'updated_at'> {}

class WhatsappSession extends Model<WhatsappSessionAttributes, WhatsappSessionCreationAttributes> implements WhatsappSessionAttributes {
  public id!: number;
  public uuid!: string;
  public user_id!: number;
  public status!: 'initializing' | 'qr' | 'authenticated' | 'ready' | 'disconnected' | 'auth_failure';
  public qrCode?: string;
  public lastActivity?: Date;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

WhatsappSession.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    uuid: {
      type: DataTypes.STRING(36),
      allowNull: false,
      unique: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('initializing', 'qr', 'authenticated', 'ready', 'disconnected', 'auth_failure'),
      allowNull: false,
      defaultValue: 'initializing',
    },
    qrCode: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lastActivity: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
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
  }
);

// Associations
WhatsappSession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(WhatsappSession, { foreignKey: 'user_id', as: 'whatsappSessions' });

export default WhatsappSession;
