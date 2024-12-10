import { createObjectCsvWriter } from 'csv-writer';
import { SecurityFinding } from '../types';
import path from 'path';
import logger from './logger';

export class SecurityFindingsExporter {
    private static formatDate(): string {
        return new Date().toISOString().replace(/[:.]/g, '-');
    }

    static async exportToCSV(findings: {
        ec2Findings: SecurityFinding[],
        iamFindings: SecurityFinding[],
        s3Findings: SecurityFinding[],
        kmsFindings: SecurityFinding[],
        rdsFindings: SecurityFinding[],
        cloudTrailFindings: SecurityFinding[],
        configFindings: SecurityFinding[],
        guardDutyFindings: SecurityFinding[],
        cloudWatchFindings: SecurityFinding[]
    }): Promise<string> {
        const timestamp = this.formatDate();
        const outputDir = 'reports';
        const fileName = `aws-security-findings-${timestamp}.csv`;
        const filePath = path.join(outputDir, fileName);

        // Ensure the reports directory exists
        const fs = require('fs');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'timestamp', title: 'TIMESTAMP' },
                { id: 'service', title: 'SERVICE' },
                { id: 'severity', title: 'SEVERITY' },
                { id: 'description', title: 'DESCRIPTION' },
                { id: 'details', title: 'DETAILS' },
                { id: 'affected', title: 'AFFECTED RESOURCES' }
            ]
        });

        const records = [
            ...findings.ec2Findings.map(finding => ({
                timestamp: new Date().toISOString(),
                service: 'EC2',
                severity: finding.severity,
                description: finding.description,
                details: finding.details || '',
                affected: JSON.stringify(finding.affected || '')
            })),
            ...findings.iamFindings.map(finding => ({
                timestamp: new Date().toISOString(),
                service: 'IAM',
                severity: finding.severity,
                description: finding.description,
                details: finding.details || '',
                affected: JSON.stringify(finding.affected || '')
            })),
            ...findings.s3Findings.map(finding => ({
                timestamp: new Date().toISOString(),
                service: 'S3',
                severity: finding.severity,
                description: finding.description,
                details: finding.details || '',
                affected: JSON.stringify(finding.affected || '')
            })),
            ...findings.kmsFindings.map(finding => ({
                timestamp: new Date().toISOString(),
                service: 'KMS',
                severity: finding.severity,
                description: finding.description,
                details: finding.details || '',
                affected: JSON.stringify(finding.affected || '')
            })),
            ...findings.rdsFindings.map(finding => ({
                timestamp: new Date().toISOString(),
                service: 'RDS',
                severity: finding.severity,
                description: finding.description,
                details: finding.details || '',
                affected: JSON.stringify(finding.affected || '')
            })),
            ...findings.cloudTrailFindings.map(finding => ({
                timestamp: new Date().toISOString(),
                service: 'CloudTrail',
                severity: finding.severity,
                description: finding.description,
                details: finding.details || '',
                affected: JSON.stringify(finding.affected || '')
            })),
            ...findings.configFindings.map(finding => ({
                timestamp: new Date().toISOString(),
                service: 'AWS Config',
                severity: finding.severity,
                description: finding.description,
                details: finding.details || '',
                affected: JSON.stringify(finding.affected || '')
            })),
            ...findings.guardDutyFindings.map(finding => ({
                timestamp: new Date().toISOString(),
                service: 'GuardDuty',
                severity: finding.severity,
                description: finding.description,
                details: finding.details || '',
                affected: JSON.stringify(finding.affected || '')
            })),
            ...findings.cloudWatchFindings.map(finding => ({
                timestamp: new Date().toISOString(),
                service: 'CloudWatch',
                severity: finding.severity,
                description: finding.description,
                details: finding.details || '',
                affected: JSON.stringify(finding.affected || '')
            }))
        ];

        try {
            await csvWriter.writeRecords(records);
            logger.info(`Security findings exported to ${filePath}`);
            return filePath;
        } catch (error) {
            logger.error('Error exporting findings to CSV:', error);
            throw error;
        }
    }
}
