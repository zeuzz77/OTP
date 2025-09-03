import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../db';
import User from './User';

interface OtpAttributes {
  id: number;
  user_id: number;
  phone: string;
  otp_code: string;
  sent_status: number;
  uuid: string;
}

interface OtpCreationAttributes extends Optional<OtpAttributes, 'id'> {}

class Otp extends Model<OtpAttributes, OtpCreationAttributes> implements OtpAttributes {
  public id!: number;
  public user_id!: number;
  public phone!: string;
  public otp_code!: string;
  public uuid!: string;
  public sent_status!: number;
}

Otp.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    otp_code: {
      type: DataTypes.STRING(6),
      allowNull: false,
    },
    uuid: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    sent_status: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Otp',
    tableName: 'otp_logs',
    timestamps: false,
    indexes: [
      {
        fields: ['phone']
      },
      {
        fields: ['uuid']
      },
      {
        fields: ['otp_code']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['sent_status']
      }
    ]
  }
);

// Associations
Otp.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Otp, { foreignKey: 'user_id', as: 'otps' });

export default Otp;
