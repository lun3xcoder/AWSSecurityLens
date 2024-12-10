import { Database } from 'sqlite3';
import { open } from 'sqlite';

export interface AWSAccount {
  id: number;
  accountId: string;
  accountName: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AWSRegion {
  id: number;
  accountId: number;
  region: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetFinding {
  id: number;
  accountId: number;
  region: string;
  resourceId: string;
  resourceType: string;
  resourceName?: string;
  service: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  finding: string;
  description: string;
  remediation: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function initializeDatabase() {
  const db = await open({
    filename: 'aws-security.db',
    driver: Database
  });

  // Create AWS accounts table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS aws_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL UNIQUE,
      account_name TEXT NOT NULL,
      access_key_id TEXT NOT NULL,
      secret_access_key TEXT NOT NULL,
      session_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create AWS regions table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS aws_regions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      region TEXT NOT NULL,
      enabled BOOLEAN DEFAULT true,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES aws_accounts(id),
      UNIQUE(account_id, region)
    )
  `);

  // Create findings table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS asset_findings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      region TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_name TEXT,
      service TEXT NOT NULL,
      severity TEXT CHECK(severity IN ('HIGH', 'MEDIUM', 'LOW')) NOT NULL,
      finding TEXT NOT NULL,
      description TEXT NOT NULL,
      remediation TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES aws_accounts(id)
    )
  `);

  return db;
}
