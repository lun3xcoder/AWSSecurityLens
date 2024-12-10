import { CloudTrailClient, DescribeTrailsCommand, GetTrailStatusCommand } from '@aws-sdk/client-cloudtrail';
import { AssetFinding } from '../../db/schema';

type Finding = Omit<AssetFinding, 'id' | 'accountId' | 'region' | 'createdAt' | 'updatedAt'>;

export class CloudTrailScanner {
  async scan(account: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }, region: string): Promise<Finding[]> {
    const client = new CloudTrailClient({
      credentials: {
        accessKeyId: account.accessKeyId,
        secretAccessKey: account.secretAccessKey,
        sessionToken: account.sessionToken,
      },
      region,
    });

    const findings: Finding[] = [];

    try {
      const trails = await client.send(new DescribeTrailsCommand({}));

      if (!trails.trailList?.length) {
        findings.push({
          resourceId: 'account',
          resourceType: 'CLOUDTRAIL_ACCOUNT',
          resourceName: 'Account CloudTrail',
          service: 'CloudTrail',
          severity: 'HIGH',
          finding: 'No CloudTrail Configured',
          description: 'No CloudTrail trails are configured in this region.',
          remediation: 'Configure CloudTrail to track API activity in your AWS account.',
        });
        return findings;
      }

      for (const trail of trails.trailList) {
        if (!trail.Name) continue;

        const status = await client.send(new GetTrailStatusCommand({ Name: trail.Name }));

        if (!status.IsLogging) {
          findings.push({
            resourceId: trail.TrailARN || trail.Name,
            resourceType: 'CLOUDTRAIL_TRAIL',
            resourceName: trail.Name,
            service: 'CloudTrail',
            severity: 'HIGH',
            finding: 'CloudTrail Logging Disabled',
            description: `CloudTrail ${trail.Name} is not actively logging.`,
            remediation: 'Enable logging for the CloudTrail trail to maintain audit records.',
          });
        }

        if (!trail.IsMultiRegionTrail) {
          findings.push({
            resourceId: trail.TrailARN || trail.Name,
            resourceType: 'CLOUDTRAIL_TRAIL',
            resourceName: trail.Name,
            service: 'CloudTrail',
            severity: 'MEDIUM',
            finding: 'Single-Region Trail',
            description: `CloudTrail ${trail.Name} is only logging events for a single region.`,
            remediation: 'Consider enabling multi-region logging to capture events across all regions.',
          });
        }

        if (!trail.LogFileValidationEnabled) {
          findings.push({
            resourceId: trail.TrailARN || trail.Name,
            resourceType: 'CLOUDTRAIL_TRAIL',
            resourceName: trail.Name,
            service: 'CloudTrail',
            severity: 'MEDIUM',
            finding: 'Log File Validation Disabled',
            description: `CloudTrail ${trail.Name} does not have log file validation enabled.`,
            remediation: 'Enable log file validation to ensure log file integrity.',
          });
        }
      }
    } catch (error) {
      console.error('Error scanning CloudTrail:', error);
    }

    return findings;
  }
}
