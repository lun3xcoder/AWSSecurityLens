import { Router } from 'express';
import { DatabaseService } from '../../db/service';
import { SecurityScanner } from '../../scanner';

export function scannerRouter(dbService: DatabaseService) {
  const router = Router();
  const scanner = new SecurityScanner(dbService);

  // Scan a specific account
  router.post('/scan/:accountId', async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const findings = await scanner.scanAccount(accountId);
      res.json({ success: true, findings });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Scan all accounts
  router.post('/scan-all', async (req, res) => {
    try {
      const findings = await scanner.scanAllAccounts();
      res.json({ success: true, findings });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  return router;
}
