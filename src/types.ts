export interface SecurityFinding {
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    affected?: any;
    details?: string;
}

export interface SecurityResults {
    findings: SecurityFinding[];
}

export interface EC2SecurityResults extends SecurityResults {
    instances: any[];
    securityGroups: any[];
}

export interface IAMSecurityResults extends SecurityResults {
    users: any[];
    passwordPolicy: any;
}

export interface S3SecurityResults extends SecurityResults {
    buckets: any[];
    bucketPolicies: BucketPolicy[];
}

export interface BucketPolicy {
    bucket: string;
    policy: string | null;
}

export interface KMSSecurityResults extends SecurityResults {
    keys: any[];
    keyRotationStatuses: any[];
}

export interface RDSSecurityResults extends SecurityResults {
    instances: any[];
}

export interface CloudTrailSecurityResults extends SecurityResults {
    trails: any[];
    trailStatuses: any[];
}

export interface ConfigSecurityResults extends SecurityResults {
    configRecorders: any[];
}

export interface GuardDutySecurityResults extends SecurityResults {
    detectors: any[];
    detectorDetails: any[];
}

export interface CloudWatchSecurityResults extends SecurityResults {
    logGroups: any[];
}
