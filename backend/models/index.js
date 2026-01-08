const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    dialectOptions: dbConfig.dialectOptions || {}
  }
);

// Import models
const User = require('./User')(sequelize, Sequelize.DataTypes);
const Attendance = require('./Attendance')(sequelize, Sequelize.DataTypes);
const Setting = require('./Setting')(sequelize, Sequelize.DataTypes);

// Define associations
User.hasMany(Attendance, { foreignKey: 'userId', as: 'attendances' });
Attendance.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  Sequelize,
  User,
  Attendance,
  Setting
};
