import { Database } from 'sqlite';
import { open } from 'sqlite';
import { Database as SQLite3Database } from 'sqlite3';
import { AWSAccount, AWSRegion, AssetFinding } from './schema';
import logger from '../logger';

export class DatabaseService {
  private db?: Database;

  async initialize() {
    this.db = await open({
      filename: 'aws-security.db',
      driver: SQLite3Database
    });

    // Create tables if they don't exist
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS aws_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL UNIQUE,
        account_name TEXT NOT NULL,
        access_key_id TEXT NOT NULL,
        secret_access_key TEXT NOT NULL,
        session_token TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS aws_regions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        region TEXT NOT NULL,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES aws_accounts(id)
      );

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
        description TEXT,
        remediation TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES aws_accounts(id)
      );
    `);
  }

  private ensureInitialized() {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  // AWS Account Operations
  async addAccount(account: Omit<AWSAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const db = this.ensureInitialized();
    const result = await db.run(
      `INSERT INTO aws_accounts (account_id, account_name, access_key_id, secret_access_key, session_token)
       VALUES (?, ?, ?, ?, ?)`,
      [account.accountId, account.accountName, account.accessKeyId, account.secretAccessKey, account.sessionToken]
    );
    return result.lastID!;
  }

  async getAccounts(): Promise<AWSAccount[]> {
    const db = this.ensureInitialized();
    const accounts = await db.all(`
      SELECT 
        id,
        account_id as accountId,
        account_name as accountName,
        access_key_id as accessKeyId,
        secret_access_key as secretAccessKey,
        session_token as sessionToken,
        created_at as createdAt,
        updated_at as updatedAt
      FROM aws_accounts
    `);
    return accounts;
  }

  async getAccount(id: number): Promise<AWSAccount | undefined> {
    const db = this.ensureInitialized();
    logger.info(`Getting account details for ID: ${id}`);
    const account = await db.get(`
      SELECT 
        id, account_id, account_name, access_key_id, secret_access_key, session_token,
        created_at, updated_at
      FROM aws_accounts 
      WHERE id = ?
    `, id);
    
    if (!account) {
      logger.warn(`No account found with ID: ${id}`);
      return undefined;
    }

    logger.info(`Found account: ${account.account_name} (${account.account_id})`);
    return {
      id: account.id,
      accountId: account.account_id,
      accountName: account.account_name,
      accessKeyId: account.access_key_id,
      secretAccessKey: account.secret_access_key,
      sessionToken: account.session_token,
      createdAt: new Date(account.created_at),
      updatedAt: new Date(account.updated_at)
    };
  }

  async deleteAccount(id: number): Promise<void> {
    const db = this.ensureInitialized();
    await db.run('BEGIN TRANSACTION');
    try {
      // Delete findings first (foreign key constraint)
      await db.run('DELETE FROM asset_findings WHERE account_id = ?', id);
      
      // Delete regions (foreign key constraint)
      await db.run('DELETE FROM aws_regions WHERE account_id = ?', id);
      
      // Finally delete the account
      await db.run('DELETE FROM aws_accounts WHERE id = ?', id);
      
      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }

  // AWS Region Operations
  async addRegion(region: Omit<AWSRegion, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const db = this.ensureInitialized();
    const result = await db.run(
      `INSERT INTO aws_regions (account_id, region, enabled)
       VALUES (?, ?, ?)`,
      [region.accountId, region.region, region.enabled]
    );
    return result.lastID!;
  }

  async getRegions(accountId: number): Promise<AWSRegion[]> {
    const db = this.ensureInitialized();
    return db.all('SELECT * FROM aws_regions WHERE account_id = ?', accountId);
  }

  async getEnabledRegions(accountId: number): Promise<AWSRegion[]> {
    const db = this.ensureInitialized();
    return db.all('SELECT * FROM aws_regions WHERE account_id = ? AND enabled = 1', accountId);
  }

  async updateRegionStatus(id: number, enabled: boolean): Promise<void> {
    const db = this.ensureInitialized();
    await db.run(
      'UPDATE aws_regions SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [enabled, id]
    );
  }

  // Asset Finding Operations
  async addFinding(finding: Omit<AssetFinding, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const db = this.ensureInitialized();
    const result = await db.run(
      `INSERT INTO asset_findings (
        account_id, region, resource_id, resource_type, resource_name,
        service, severity, finding, description, remediation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finding.accountId,
        finding.region,
        finding.resourceId,
        finding.resourceType,
        finding.resourceName,
        finding.service,
        finding.severity,
        finding.finding,
        finding.description,
        finding.remediation,
      ]
    );
    return result.lastID!;
  }

  async storeFindingsForAccount(accountId: number, findings: Omit<AssetFinding, 'id' | 'accountId' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    const db = this.ensureInitialized();
    const stmt = await db.prepare(`
      INSERT INTO asset_findings (
        account_id, region, resource_id, resource_type, resource_name,
        service, severity, finding, description, remediation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const finding of findings) {
      await stmt.run(
        accountId,
        finding.region,
        finding.resourceId,
        finding.resourceType,
        finding.resourceName,
        finding.service,
        finding.severity,
        finding.finding,
        finding.description,
        finding.remediation
      );
    }

    await stmt.finalize();
  }

  async getFindings(filters: {
    accountId?: number;
    region?: string;
    service?: string;
    severity?: string;
  } = {}): Promise<AssetFinding[]> {
    const db = this.ensureInitialized();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.accountId) {
      conditions.push('account_id = ?');
      params.push(filters.accountId);
    }
    if (filters.region) {
      conditions.push('region = ?');
      params.push(filters.region);
    }
    if (filters.service) {
      conditions.push('service = ?');
      params.push(filters.service);
    }
    if (filters.severity) {
      conditions.push('severity = ?');
      params.push(filters.severity);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const findings = await db.all(`
      SELECT 
        id,
        account_id as accountId,
        region,
        resource_id as resourceId,
        resource_type as resourceType,
        resource_name as resourceName,
        service,
        severity,
        finding,
        description,
        remediation,
        created_at as createdAt,
        updated_at as updatedAt
      FROM asset_findings 
      ${whereClause} 
      ORDER BY created_at DESC
    `, params);

    return findings.map(finding => ({
      ...finding,
      createdAt: new Date(finding.createdAt),
      updatedAt: new Date(finding.updatedAt)
    }));
  }

  async getFindingStats(accountId?: number): Promise<any> {
    const db = this.ensureInitialized();
    const whereClause = accountId ? 'WHERE account_id = ?' : '';
    const params = accountId ? [accountId] : [];

    const [bySeverity, byService] = await Promise.all([
      db.all(`
        SELECT severity, COUNT(*) as count
        FROM asset_findings
        ${whereClause}
        GROUP BY severity
      `, params),
      db.all(`
        SELECT service, COUNT(*) as count
        FROM asset_findings
        ${whereClause}
        GROUP BY service
      `, params)
    ]);

    const totalFindings = bySeverity.reduce((sum: number, curr: any) => sum + curr.count, 0);

    return {
      totalFindings,
      bySeverity: bySeverity,
      byService: byService
    };
  }

  async getFindingsByAsset(resourceId: string): Promise<AssetFinding[]> {
    const db = this.ensureInitialized();
    return db.all('SELECT * FROM asset_findings WHERE resource_id = ?', resourceId);
  }
}
