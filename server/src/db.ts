import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MYSQL_URI;
if (!uri) throw new Error("Missing MYSQL_URI in env");

export const sequelize = new Sequelize(uri, {
  dialect: "mysql",
  logging: false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
});
