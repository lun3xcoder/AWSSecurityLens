import express from 'express';
import cors from 'cors';
import { DatabaseService } from '../db/service';
import { accountsRouter } from './routes/accounts';
import { findingsRouter } from './routes/findings';
import { scannerRouter } from './routes/scanner';
import { SecurityScanner } from '../scanner';

export function createApp(dbService: DatabaseService) {
  const app = express();
  const scanner = new SecurityScanner(dbService);

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
      error: err.message || 'Internal Server Error',
    });
  });

  // Routes
  app.use('/api/accounts', accountsRouter(dbService));
  app.use('/api/findings', findingsRouter(dbService, scanner));
  app.use('/api/scanner', scannerRouter(dbService));

  return app;
}
