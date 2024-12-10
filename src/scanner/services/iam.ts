import { IAMClient, GetAccountSummaryCommand, ListUsersCommand, ListAccessKeysCommand } from '@aws-sdk/client-iam';
import { AssetFinding } from '../../db/schema';

type Finding = Omit<AssetFinding, 'id' | 'accountId' | 'region' | 'createdAt' | 'updatedAt'>;

export class IAMScanner {
  async scan(account: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }, region: string): Promise<Finding[]> {
    const client = new IAMClient({
      credentials: {
        accessKeyId: account.accessKeyId,
        secretAccessKey: account.secretAccessKey,
        sessionToken: account.sessionToken,
      },
      region,
    });

    const findings: Finding[] = [];

    try {
      // Check account password policy
      const accountSummary = await client.send(new GetAccountSummaryCommand({}));
      
      if (!accountSummary.SummaryMap?.AccountMFAEnabled) {
        findings.push({
          resourceId: 'account',
          resourceType: 'IAM_ACCOUNT',
          resourceName: 'Root Account',
          service: 'IAM',
          severity: 'HIGH',
          finding: 'Root Account MFA Not Enabled',
          description: 'The root account does not have Multi-Factor Authentication (MFA) enabled.',
          remediation: 'Enable MFA for the root account to enhance security.',
        });
      }

      // Check IAM users
      const users = await client.send(new ListUsersCommand({}));
      
      for (const user of users.Users || []) {
        // Check for access keys
        const accessKeys = await client.send(new ListAccessKeysCommand({ UserName: user.UserName }));
        
        if ((accessKeys.AccessKeyMetadata || []).length > 1) {
          findings.push({
            resourceId: user.UserId!,
            resourceType: 'IAM_USER',
            resourceName: user.UserName,
            service: 'IAM',
            severity: 'MEDIUM',
            finding: 'Multiple Access Keys',
            description: `User ${user.UserName} has multiple active access keys.`,
            remediation: 'Review and remove unnecessary access keys. Each user should typically have at most one active access key.',
          });
        }

        if (!user.PasswordLastUsed) {
          findings.push({
            resourceId: user.UserId!,
            resourceType: 'IAM_USER',
            resourceName: user.UserName,
            service: 'IAM',
            severity: 'LOW',
            finding: 'Inactive User',
            description: `User ${user.UserName} has never signed in or has not signed in recently.`,
            remediation: 'Review and remove inactive users to maintain good security hygiene.',
          });
        }
      }
    } catch (error) {
      console.error('Error scanning IAM:', error);
    }

    return findings;
  }
}
