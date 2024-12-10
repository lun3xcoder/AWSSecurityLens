import { CloudWatchClient, DescribeAlarmsCommand } from '@aws-sdk/client-cloudwatch';
import { AssetFinding } from '../../db/schema';

type Finding = Omit<AssetFinding, 'id' | 'accountId' | 'region' | 'createdAt' | 'updatedAt'>;

export class CloudWatchScanner {
  async scan(account: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }, region: string): Promise<Finding[]> {
    const client = new CloudWatchClient({
      credentials: {
        accessKeyId: account.accessKeyId,
        secretAccessKey: account.secretAccessKey,
        sessionToken: account.sessionToken,
      },
      region,
    });

    const findings: Finding[] = [];

    try {
      const alarms = await client.send(new DescribeAlarmsCommand({}));

      if (!alarms.MetricAlarms?.length) {
        findings.push({
          resourceId: 'account',
          resourceType: 'CLOUDWATCH_ACCOUNT',
          resourceName: 'Account CloudWatch',
          service: 'CloudWatch',
          severity: 'MEDIUM',
          finding: 'No CloudWatch Alarms',
          description: 'No CloudWatch alarms are configured in this region.',
          remediation: 'Configure CloudWatch alarms to monitor critical metrics and receive notifications.',
        });
      } else {
        const disabledAlarms = alarms.MetricAlarms.filter(alarm => alarm.ActionsEnabled === false);
        
        if (disabledAlarms.length > 0) {
          findings.push({
            resourceId: 'account',
            resourceType: 'CLOUDWATCH_ACCOUNT',
            resourceName: 'Account CloudWatch',
            service: 'CloudWatch',
            severity: 'LOW',
            finding: 'Disabled CloudWatch Alarms',
            description: `${disabledAlarms.length} CloudWatch alarms are disabled.`,
            remediation: 'Review and enable important CloudWatch alarms or remove unnecessary ones.',
          });
        }

        const alarmsWithoutActions = alarms.MetricAlarms.filter(alarm => 
          (!alarm.AlarmActions || alarm.AlarmActions.length === 0) &&
          (!alarm.OKActions || alarm.OKActions.length === 0) &&
          (!alarm.InsufficientDataActions || alarm.InsufficientDataActions.length === 0)
        );

        if (alarmsWithoutActions.length > 0) {
          findings.push({
            resourceId: 'account',
            resourceType: 'CLOUDWATCH_ACCOUNT',
            resourceName: 'Account CloudWatch',
            service: 'CloudWatch',
            severity: 'MEDIUM',
            finding: 'Alarms Without Actions',
            description: `${alarmsWithoutActions.length} CloudWatch alarms have no actions configured.`,
            remediation: 'Configure actions (such as SNS notifications) for alarms to ensure proper notification of events.',
          });
        }
      }
    } catch (error) {
      console.error('Error scanning CloudWatch:', error);
    }

    return findings;
  }
}
