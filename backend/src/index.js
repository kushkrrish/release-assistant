const express=require('express');
const cors = require('cors');
const app = express();
const connectDB = require('./config/dbConfig');
const config = require('./config/config');
const v1Routes = require('./routes/v1');
// Middleware
app.use(cors());
app.use(express.json());

app.use('/api/v1', v1Routes);
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Release Assistant API is running' });
});


const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    await connectDB();

    app.listen(config.PORT, () => {
      console.log(`Server is running on port ${config.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();