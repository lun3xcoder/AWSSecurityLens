import { GuardDutyClient, ListFindingsCommand, GetFindingsCommand, ListDetectorsCommand } from '@aws-sdk/client-guardduty';
import { AssetFinding } from '../../db/schema';
import logger from '../../logger'; // Assuming you have a logger module

type Finding = Omit<AssetFinding, 'id' | 'accountId' | 'region' | 'createdAt' | 'updatedAt'>;

export class GuardDutyScanner {
  async scan(account: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }, region: string): Promise<Finding[]> {
    logger.info(`[GuardDuty] Starting scan in region ${region} for account ${account.accessKeyId}`);
    
    if (!account.accessKeyId || !account.secretAccessKey) {
      logger.error('[GuardDuty] Missing AWS credentials');
      throw new Error('Missing AWS credentials');
    }

    logger.info(`[GuardDuty] Creating GuardDuty client for region ${region}`);
    const client = new GuardDutyClient({
      credentials: {
        accessKeyId: account.accessKeyId,
        secretAccessKey: account.secretAccessKey,
        sessionToken: account.sessionToken,
      },
      region,
    });

    const findings: Finding[] = [];

    try {
      // First check if GuardDuty is enabled by listing detectors
      logger.info(`[GuardDuty] Checking if GuardDuty is enabled in ${region}`);
      const detectors = await client.send(new ListDetectorsCommand({}));
      
      if (!detectors.DetectorIds?.length) {
        logger.warn(`[GuardDuty] Not enabled in ${region}`);
        findings.push({
          resourceId: 'account',
          resourceType: 'GUARDDUTY_ACCOUNT',
          resourceName: 'Account GuardDuty',
          service: 'GuardDuty',
          severity: 'HIGH',
          finding: 'GuardDuty Not Enabled',
          description: 'GuardDuty is not enabled in this region.',
          remediation: 'Enable GuardDuty to detect potential security threats and unauthorized behavior.',
        });
        return findings;
      }

      const detectorId = detectors.DetectorIds[0];
      logger.info(`[GuardDuty] Found detector ${detectorId} in ${region}`);

      // Get GuardDuty findings
      logger.info(`[GuardDuty] Fetching findings for detector ${detectorId}`);
      const listFindingsResult = await client.send(new ListFindingsCommand({
        DetectorId: detectorId,
        FindingCriteria: {
          Criterion: {
            severity: {
              Gte: 4, // Medium severity and above
            },
          },
        },
      }));

      logger.info(`[GuardDuty] Found ${listFindingsResult.FindingIds?.length || 0} findings`);

      if (listFindingsResult.FindingIds && listFindingsResult.FindingIds.length > 0) {
        const guardDutyFindings = await client.send(new GetFindingsCommand({
          DetectorId: detectorId,
          FindingIds: listFindingsResult.FindingIds,
        }));

        logger.info(`[GuardDuty] Retrieved ${guardDutyFindings.Findings?.length || 0} finding details`);

        for (const finding of guardDutyFindings.Findings || []) {
          const resource = finding.Resource as any;
          const resourceId = resource?.Id || 'unknown';
          const resourceType = resource?.Type || 'GUARDDUTY_FINDING';

          findings.push({
            resourceId,
            resourceType,
            resourceName: finding.Title || 'Unknown Finding',
            service: 'GuardDuty',
            severity: finding.Severity && finding.Severity >= 7 ? 'HIGH' : finding.Severity && finding.Severity >= 4 ? 'MEDIUM' : 'LOW',
            finding: finding.Type || 'Unknown Finding Type',
            description: finding.Description || 'No description available',
            remediation: 'Review GuardDuty finding details and take appropriate action.',
          });
        }
      }
    } catch (error) {
      logger.error('[GuardDuty] Error scanning:', error);
      if (error instanceof Error) {
        if (error.name === 'UnrecognizedClientException' || (error as any)?.$metadata?.httpStatusCode === 403) {
          throw error; // Propagate credential errors
        }
        if (error.message.includes('credentials')) {
          throw new Error('AWS credentials error: ' + error.message);
        }
        if (error.message.includes('AccessDenied')) {
          throw new Error('Access denied to GuardDuty. Please check IAM permissions.');
        }
      }
      throw error;
    }

    logger.info(`[GuardDuty] Scan complete in ${region}. Found ${findings.length} findings`);
    return findings;
  }
}
