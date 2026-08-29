import app from './src/app.js';
import { config } from './src/config/env.js';
import { connectDB } from './src/config/db.js';

const PORT = config.port;

const startServer = async () => {
  try {
    // 1. Connect to Database first
    await connectDB();
    
    // 2. Start Express server after DB connection succeeds
    app.listen(PORT, () => {
      console.log(`🚀 CampusHub Backend Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();