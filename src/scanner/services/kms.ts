import { KMSClient, ListKeysCommand, DescribeKeyCommand } from '@aws-sdk/client-kms';
import { AssetFinding } from '../../db/schema';

type Finding = Omit<AssetFinding, 'id' | 'accountId' | 'region' | 'createdAt' | 'updatedAt'>;

export class KMSScanner {
  async scan(account: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }, region: string): Promise<Finding[]> {
    const client = new KMSClient({
      credentials: {
        accessKeyId: account.accessKeyId,
        secretAccessKey: account.secretAccessKey,
        sessionToken: account.sessionToken,
      },
      region,
    });

    const findings: Finding[] = [];

    try {
      const keys = await client.send(new ListKeysCommand({}));

      if (!keys.Keys?.length) {
        findings.push({
          resourceId: 'account',
          resourceType: 'KMS_ACCOUNT',
          resourceName: 'Account KMS',
          service: 'KMS',
          severity: 'LOW',
          finding: 'No KMS Keys',
          description: 'No KMS keys are configured in this region.',
          remediation: 'Consider using KMS keys for encrypting sensitive data.',
        });
        return findings;
      }

      for (const key of keys.Keys) {
        if (!key.KeyId) continue;

        const keyDetails = await client.send(new DescribeKeyCommand({ KeyId: key.KeyId }));
        const metadata = keyDetails.KeyMetadata;

        if (!metadata) continue;

        const resourceId = metadata.Arn || metadata.KeyId || 'unknown';
        const resourceName = metadata.KeyId || 'unknown';

        if (metadata.KeyState === 'Disabled') {
          findings.push({
            resourceId,
            resourceType: 'KMS_KEY',
            resourceName,
            service: 'KMS',
            severity: 'MEDIUM',
            finding: 'Disabled KMS Key',
            description: `KMS key ${metadata.KeyId} is disabled.`,
            remediation: 'Review and enable important KMS keys or schedule them for deletion if no longer needed.',
          });
        }

        if (metadata.KeyState === 'PendingDeletion') {
          findings.push({
            resourceId,
            resourceType: 'KMS_KEY',
            resourceName,
            service: 'KMS',
            severity: 'HIGH',
            finding: 'KMS Key Pending Deletion',
            description: `KMS key ${metadata.KeyId} is scheduled for deletion.`,
            remediation: 'Review if the key should be deleted. Cancel deletion if the key is still needed.',
          });
        }

        if (metadata.Origin === 'AWS_KMS') {
          findings.push({
            resourceId,
            resourceType: 'KMS_KEY',
            resourceName,
            service: 'KMS',
            severity: 'LOW',
            finding: 'AWS Managed Key Material',
            description: `KMS key ${metadata.KeyId} uses AWS-managed key material.`,
            remediation: 'Consider using customer-managed key material for better control over the key lifecycle.',
          });
        }
      }
    } catch (error) {
      console.error('Error scanning KMS:', error);
    }

    return findings;
  }
}
