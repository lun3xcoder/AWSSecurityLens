import { DatabaseService } from '../db/service';
import { IAMScanner } from './services/iam';
import { CloudTrailScanner } from './services/cloudtrail';
import { CloudWatchScanner } from './services/cloudwatch';
import { KMSScanner } from './services/kms';
import { GuardDutyScanner } from './services/guardduty';
import { SecurityHubScanner } from './services/securityhub';
import logger from '../logger'; // Assuming logger is imported from another module

export class SecurityScanner {
  private dbService: DatabaseService;
  private iamScanner: IAMScanner;
  private cloudTrailScanner: CloudTrailScanner;
  private cloudWatchScanner: CloudWatchScanner;
  private kmsScanner: KMSScanner;
  private guardDutyScanner: GuardDutyScanner;
  private securityHubScanner: SecurityHubScanner;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
    this.iamScanner = new IAMScanner();
    this.cloudTrailScanner = new CloudTrailScanner();
    this.cloudWatchScanner = new CloudWatchScanner();
    this.kmsScanner = new KMSScanner();
    this.guardDutyScanner = new GuardDutyScanner();
    this.securityHubScanner = new SecurityHubScanner();
  }

  async scanAccount(accountId: number): Promise<any> {
    logger.info(`Starting scan for account ID: ${accountId}`);
    
    const account = await this.dbService.getAccount(accountId);
    if (!account) {
      logger.error(`Account ${accountId} not found`);
      throw new Error(`Account ${accountId} not found`);
    }

    logger.info(`Scanning account ${account.accountName} (${account.accountId})`);

    const enabledRegions = await this.dbService.getEnabledRegions(accountId);
    logger.info(`Found ${enabledRegions.length} enabled regions:`, { regions: enabledRegions.map(r => r.region) });

    const allFindings: any[] = [];

    for (const region of enabledRegions) {
      logger.info(`Starting scan for region ${region.region}`);
      try {
        // Try GuardDuty first to validate credentials
        try {
          await this.guardDutyScanner.scan(account, region.region);
        } catch (error: any) {
          if (error?.name === 'UnrecognizedClientException' || error?.$metadata?.httpStatusCode === 403) {
            logger.error(`Invalid AWS credentials for account ${account.accountName}. Stopping scan.`);
            throw new Error(`Invalid AWS credentials for account ${account.accountName}`);
          }
        }

        const findings = await Promise.all([
          this.iamScanner.scan(account, region.region).catch(e => {
            logger.error(`IAM Scanner error in ${region.region}:`, e);
            return [];
          }),
          this.cloudTrailScanner.scan(account, region.region).catch(e => {
            logger.error(`CloudTrail Scanner error in ${region.region}:`, e);
            return [];
          }),
          this.cloudWatchScanner.scan(account, region.region).catch(e => {
            logger.error(`CloudWatch Scanner error in ${region.region}:`, e);
            return [];
          }),
          this.kmsScanner.scan(account, region.region).catch(e => {
            logger.error(`KMS Scanner error in ${region.region}:`, e);
            return [];
          }),
          this.guardDutyScanner.scan(account, region.region).catch(e => {
            logger.error(`GuardDuty Scanner error in ${region.region}:`, e);
            return [];
          }),
          this.securityHubScanner.scan(account, region.region).catch(e => {
            logger.error(`SecurityHub Scanner error in ${region.region}:`, e);
            return [];
          }),
        ]);

        const regionFindings = findings.flat().map(finding => ({
          ...finding,
          region: region.region
        }));
        logger.info(`Found ${regionFindings.length} findings in region ${region.region}`);
        allFindings.push(...regionFindings);
      } catch (error) {
        logger.error(`Error scanning region ${region.region}:`, error);
        throw error; // Propagate the error to stop the scan
      }
    }

    logger.info(`Total findings for account: ${allFindings.length}`);
    try {
      await this.dbService.storeFindingsForAccount(accountId, allFindings);
    } catch (error) {
      logger.error('Error during scan:', error);
      throw error;
    }
    return allFindings;
  }

  async scanAllAccounts() {
    const accounts = await this.dbService.getAccounts();
    const allFindings = [];

    for (const account of accounts) {
      try {
        const findings = await this.scanAccount(account.id);
        allFindings.push({
          accountId: account.id,
          findings,
        });
      } catch (error) {
        console.error(`Error scanning account ${account.id}:`, error);
        allFindings.push({
          accountId: account.id,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    }

    return allFindings;
  }
}
