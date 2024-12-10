import { defineStore } from 'pinia';
import axios, { AxiosError } from 'axios';
import { useNotificationStore } from './notification';

const API_BASE_URL = 'http://localhost:3000/api';

interface AWSAccount {
  id: number;
  accountId: string;
  accountName: string;
  regions: AWSRegion[];
}

interface AWSRegion {
  id: number;
  accountId: number;
  region: string;
  enabled: boolean;
}

interface Finding {
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
}

interface Stats {
  totalFindings: number;
  byService: Array<{ service: string; count: number }>;
  bySeverity: Array<{ severity: string; count: number }>;
}

interface SecurityState {
  accounts: AWSAccount[];
  selectedAccountId: number | null;
  selectedRegion: string | null;
  findings: Finding[];
  stats: Stats | null;
  loading: boolean;
  error: string | null;
}

export const useSecurityStore = defineStore('security', {
  state: (): SecurityState => ({
    accounts: [],
    selectedAccountId: null,
    selectedRegion: null,
    findings: [],
    stats: null,
    loading: false,
    error: null,
  }),

  actions: {
    async fetchAccounts() {
      try {
        this.loading = true;
        this.error = null;
        const response = await axios.get<AWSAccount[]>(`${API_BASE_URL}/accounts`);
        this.accounts = response.data;
        
        // Fetch regions for each account
        for (const account of this.accounts) {
          const regionsResponse = await axios.get<AWSRegion[]>(
            `${API_BASE_URL}/accounts/${account.id}/regions`
          );
          account.regions = regionsResponse.data;
        }
      } catch (error) {
        const notificationStore = useNotificationStore();
        const errorMessage = error instanceof Error ? error.message : 'An error occurred while fetching accounts';
        this.error = errorMessage;
        notificationStore.showError(errorMessage);
      } finally {
        this.loading = false;
      }
    },

    async addAccount(account: {
      accountName: string;
      accountId: string;
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
      regions: string[];
    }) {
      try {
        this.loading = true;
        this.error = null;
        
        // First, create the account
        const response = await axios.post(`${API_BASE_URL}/accounts`, {
          accountName: account.accountName,
          accountId: account.accountId,
          accessKeyId: account.accessKeyId,
          secretAccessKey: account.secretAccessKey,
          sessionToken: account.sessionToken,
        });

        // Then, add the selected regions
        const accountId = response.data.id;
        for (const region of account.regions) {
          await axios.post(`${API_BASE_URL}/accounts/${accountId}/regions`, {
            region,
            enabled: true,
          });
        }

        await this.fetchAccounts();
        const notificationStore = useNotificationStore();
        notificationStore.showSuccess('Account added successfully');
      } catch (error) {
        const notificationStore = useNotificationStore();
        const errorMessage = error instanceof Error ? error.message : 'An error occurred while adding account';
        this.error = errorMessage;
        notificationStore.showError(errorMessage);
      } finally {
        this.loading = false;
      }
    },

    async updateRegion(accountId: number, regionId: number, enabled: boolean) {
      try {
        this.loading = true;
        this.error = null;
        await axios.patch(
          `${API_BASE_URL}/accounts/${accountId}/regions/${regionId}`,
          { enabled }
        );
        await this.fetchAccounts();
        const notificationStore = useNotificationStore();
        notificationStore.showSuccess('Region updated successfully');
      } catch (error) {
        const notificationStore = useNotificationStore();
        const errorMessage = error instanceof Error ? error.message : 'An error occurred while updating region';
        this.error = errorMessage;
        notificationStore.showError(errorMessage);
      } finally {
        this.loading = false;
      }
    },

    async fetchFindings(filters?: {
      accountId?: number;
      region?: string;
      severity?: 'HIGH' | 'MEDIUM' | 'LOW';
    }) {
      try {
        this.loading = true;
        this.error = null;
        const params = new URLSearchParams();
        if (filters?.accountId) params.append('accountId', filters.accountId.toString());
        if (filters?.region) params.append('region', filters.region);
        if (filters?.severity) params.append('severity', filters.severity);

        const response = await axios.get<Finding[]>(`${API_BASE_URL}/findings`, { params });
        this.findings = response.data;
      } catch (error) {
        const notificationStore = useNotificationStore();
        const errorMessage = error instanceof Error ? error.message : 'An error occurred while fetching findings';
        this.error = errorMessage;
        notificationStore.showError(errorMessage);
      } finally {
        this.loading = false;
      }
    },

    async fetchStats(accountId?: number) {
      try {
        this.loading = true;
        this.error = null;
        const params = new URLSearchParams();
        if (accountId) params.append('accountId', accountId.toString());

        const response = await axios.get<Stats>(`${API_BASE_URL}/findings/stats`, { params });
        this.stats = response.data;
      } catch (error) {
        const notificationStore = useNotificationStore();
        const errorMessage = error instanceof Error ? error.message : 'An error occurred while fetching stats';
        this.error = errorMessage;
        notificationStore.showError(errorMessage);
      } finally {
        this.loading = false;
      }
    },

    async triggerScan(accountId?: number) {
      const notificationStore = useNotificationStore();
      try {
        this.loading = true;
        this.error = null;

        const endpoint = accountId 
          ? `${API_BASE_URL}/findings/scan/${accountId}`
          : `${API_BASE_URL}/findings/scan`;

        await axios.post(endpoint);
        await this.fetchFindings({ accountId });
        await this.fetchStats(accountId);
        notificationStore.showSuccess('Scan completed successfully');
      } catch (error) {
        if (error instanceof AxiosError) {
          let errorMessage = '';
          // Check for API error response first
          if (error.response?.data?.error) {
            errorMessage = error.response.data.error;
          } else if (error.response?.status === 403) {
            errorMessage = 'AWS credentials are invalid or expired. Please check your credentials and try again.';
          } else if (error.response?.status === 401) {
            errorMessage = 'Unauthorized: Please check your AWS credentials.';
          } else {
            errorMessage = 'An error occurred while scanning. Please try again.';
          }
          this.error = errorMessage;
          notificationStore.showError(errorMessage);
        } else {
          const errorMessage = error instanceof Error ? error.message : 'An error occurred while triggering scan';
          this.error = errorMessage;
          notificationStore.showError(errorMessage);
        }
      } finally {
        this.loading = false;
      }
    },

    async deleteAccount(accountId: number) {
      const notificationStore = useNotificationStore();
      try {
        this.loading = true;
        this.error = null;

        await axios.delete(`${API_BASE_URL}/accounts/${accountId}`);
        
        // If the deleted account was selected, clear the selection
        if (this.selectedAccountId === accountId) {
          this.selectedAccountId = null;
          this.selectedRegion = null;
          this.findings = [];
          this.stats = null;
        }
        
        await this.fetchAccounts();
        notificationStore.showSuccess('Account deleted successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred while deleting account';
        this.error = errorMessage;
        notificationStore.showError(errorMessage);
      } finally {
        this.loading = false;
      }
    },

    setSelectedAccount(accountId: number | null) {
      this.selectedAccountId = accountId;
      if (accountId) {
        this.fetchFindings({ accountId });
        this.fetchStats(accountId);
      }
    },

    setSelectedRegion(region: string | null) {
      this.selectedRegion = region;
      if (region && this.selectedAccountId) {
        this.fetchFindings({
          accountId: this.selectedAccountId,
          region,
        });
      }
    },
  },
});
