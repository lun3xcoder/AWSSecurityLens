import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import { DatabaseService } from './db/service';
import { createApp } from './api';
import logger from './logger';

// Load environment variables
config();

async function main() {
  try {
    // Initialize database service
    const dbService = new DatabaseService();
    await dbService.initialize();
    logger.info('Database initialized successfully');

    // Create and start Express app
    const app = createApp(dbService);
    const port = process.env.PORT || 3000;
    
    app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    logger.error('Application failed to start:', error);
    process.exit(1);
  });
}
