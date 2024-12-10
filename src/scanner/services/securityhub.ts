import { SecurityHubClient, GetEnabledStandardsCommand, GetFindingsCommand } from '@aws-sdk/client-securityhub';
import { AssetFinding } from '../../db/schema';

type Finding = Omit<AssetFinding, 'id' | 'accountId' | 'region' | 'createdAt' | 'updatedAt'>;

export class SecurityHubScanner {
  async scan(account: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }, region: string): Promise<Finding[]> {
    const client = new SecurityHubClient({
      credentials: {
        accessKeyId: account.accessKeyId,
        secretAccessKey: account.secretAccessKey,
        sessionToken: account.sessionToken,
      },
      region,
    });

    const findings: Finding[] = [];

    try {
      // Check if SecurityHub is enabled by attempting to get enabled standards
      try {
        await client.send(new GetEnabledStandardsCommand({}));
      } catch (error: any) {
        // Check if the error is because SecurityHub is not enabled
        if (error.name === 'InvalidAccessException' || error.name === 'ResourceNotFoundException') {
          findings.push({
            resourceId: 'account',
            resourceType: 'SECURITYHUB_ACCOUNT',
            resourceName: 'Account SecurityHub',
            service: 'SecurityHub',
            severity: 'HIGH',
            finding: 'SecurityHub Not Enabled',
            description: 'AWS SecurityHub is not enabled in this region.',
            remediation: 'Enable SecurityHub to aggregate, organize, and prioritize security findings.',
          });
          return findings;
        }
        throw error; // Re-throw if it's a different type of error
      }

      // Get SecurityHub findings
      const securityHubFindings = await client.send(new GetFindingsCommand({
        Filters: {
          RecordState: [{ Value: 'ACTIVE', Comparison: 'EQUALS' }],
          WorkflowStatus: [{ Value: 'NEW', Comparison: 'EQUALS' }],
        },
        MaxResults: 100, // Limit to 100 findings per scan
      }));

      for (const finding of securityHubFindings.Findings || []) {
        if (!finding.Resources || finding.Resources.length === 0) continue;

        const resource = finding.Resources[0];
        findings.push({
          resourceId: resource.Id || 'unknown',
          resourceType: resource.Type || 'SECURITYHUB_FINDING',
          resourceName: resource.Id?.split('/').pop() || 'Unknown Resource',
          service: 'SecurityHub',
          severity: this.mapSeverity(finding.Severity?.Label),
          finding: finding.Title || 'Unknown Finding',
          description: finding.Description || 'No description available',
          remediation: finding.Remediation?.Recommendation?.Text || 
                      'Review SecurityHub finding details and take appropriate action.',
        });
      }
    } catch (error) {
      console.error('Error scanning SecurityHub:', error);
      // Don't throw the error, just log it and return any findings we've collected
    }

    return findings;
  }

  private mapSeverity(severityLabel?: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    switch (severityLabel?.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return 'HIGH';
      case 'MEDIUM':
        return 'MEDIUM';
      case 'LOW':
      case 'INFORMATIONAL':
      default:
        return 'LOW';
    }
  }
}
