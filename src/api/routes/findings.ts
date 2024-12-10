import { Router } from 'express';
import { DatabaseService } from '../../db/service';
import { SecurityScanner } from '../../scanner';
import logger from '../../logger'; // assuming logger is imported from another file

export function findingsRouter(dbService: DatabaseService, scanner: SecurityScanner) {
  const router = Router();

  // Get findings with optional filters
  router.get('/', async (req, res) => {
    try {
      const { accountId, region, service, severity } = req.query;
      console.log('Getting findings with filters:', { accountId, region, service, severity });
      
      const filters: any = {};
      if (accountId) filters.accountId = parseInt(accountId as string);
      if (region) filters.region = region;
      if (service) filters.service = service;
      if (severity) filters.severity = severity;

      const findings = await dbService.getFindings(filters);
      console.log(`Found ${findings.length} findings matching filters`);
      res.json(findings);
    } catch (error) {
      console.error('Error getting findings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Get findings statistics
  router.get('/stats', async (req, res) => {
    try {
      const { accountId } = req.query;
      console.log('Getting stats for account:', accountId);
      
      const stats = await dbService.getFindingStats(
        accountId ? parseInt(accountId as string) : undefined
      );
      console.log('Stats:', stats);
      res.json(stats);
    } catch (error) {
      console.error('Error getting stats:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Get findings for a specific asset
  router.get('/asset/:resourceId', async (req, res) => {
    try {
      console.log('Getting findings for asset:', req.params.resourceId);
      const findings = await dbService.getFindingsByAsset(req.params.resourceId);
      console.log(`Found ${findings.length} findings for asset`);
      res.json(findings);
    } catch (error) {
      console.error('Error getting findings for asset:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Trigger a scan for a specific account
  router.post('/scan/:accountId', async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      logger.info(`Received scan request for account: ${accountId}`);
      
      // Get account details first
      const account = await dbService.getAccount(accountId);
      if (!account) {
        logger.error(`Account not found: ${accountId}`);
        return res.status(404).json({ error: 'Account not found' });
      }
      
      logger.info(`Starting scan for account: ${account.accountName} (${account.accountId})`);
      const results = await scanner.scanAccount(accountId);
      
      logger.info(`Scan completed for account ${accountId}. Found ${results.length} findings`);
      res.json(results);
    } catch (error) {
      logger.error('Error during scan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Trigger a scan for all accounts
  router.post('/scan', async (req, res) => {
    try {
      logger.info('Starting scan for all accounts');
      const results = await scanner.scanAllAccounts();
      logger.info(`Completed scan for all accounts`);
      res.json(results);
    } catch (error) {
      logger.error('Error during scan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  return router;
}
