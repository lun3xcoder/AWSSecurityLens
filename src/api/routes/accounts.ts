import { Router } from 'express';
import { DatabaseService } from '../../db/service';

export function accountsRouter(dbService: DatabaseService) {
  const router = Router();

  // Get all accounts
  router.get('/', async (req, res) => {
    try {
      const accounts = await dbService.getAccounts();
      res.json(accounts);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Add new account
  router.post('/', async (req, res) => {
    try {
      const {
        accountId,
        accountName,
        accessKeyId,
        secretAccessKey,
        sessionToken,
      } = req.body;

      const id = await dbService.addAccount({
        accountId,
        accountName,
        accessKeyId,
        secretAccessKey,
        sessionToken,
      });

      res.status(201).json({ id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Get account regions
  router.get('/:accountId/regions', async (req, res) => {
    try {
      const regions = await dbService.getRegions(parseInt(req.params.accountId));
      res.json(regions);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Add region to account
  router.post('/:accountId/regions', async (req, res) => {
    try {
      const { region, enabled } = req.body;
      const accountId = parseInt(req.params.accountId);

      const id = await dbService.addRegion({
        accountId,
        region,
        enabled,
      });

      res.status(201).json({ id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Update region status
  router.patch('/:accountId/regions/:regionId', async (req, res) => {
    try {
      const { enabled } = req.body;
      await dbService.updateRegionStatus(parseInt(req.params.regionId), enabled);
      res.status(200).json({ success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Delete account and all related data
  router.delete('/:accountId', async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      await dbService.deleteAccount(accountId);
      res.status(200).json({ success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  return router;
}
