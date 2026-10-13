const express=require('express');
const cors = require('cors');
const app = express();
const connectDB = require('./config/dbConfig');
const config = require('./config/config');
const v1Routes = require('./routes/v1');
const logger = require('./utils/logger');

// Middleware
app.use(logger.requestMiddleware);
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || config.CORS_ORIGINS.includes(origin));
  },
  credentials: true
}));
app.use(express.json());

app.use('/api/v1', v1Routes);
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Release Assistant API is running' });
});


const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(config.PORT, () => {
      logger.info('http.server.started', {
        port: config.PORT,
        environment: config.NODE_ENV
      });
    });

    server.on('error', (error) => {
      logger.error('http.server.listen_failed', {
        port: config.PORT,
        error: logger.errorDetails(error)
      });
      process.exit(1);
    });
  } catch (error) {
    logger.error('http.server.start_failed', {
      error: logger.errorDetails(error)
    });
    process.exit(1);
  }
};

startServer();