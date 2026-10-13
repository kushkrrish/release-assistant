const mongoose = require('mongoose');
const { MONGO_URI } = require('./config');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info('database.mongodb.connected');
  } catch (error) {
    logger.error('database.mongodb.connection_failed', {
      error: logger.errorDetails(error)
    });
    process.exit(1);
  }
};

module.exports = connectDB;