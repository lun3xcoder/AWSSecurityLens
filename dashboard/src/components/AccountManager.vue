<template>
  <v-card class="mb-4">
    <v-card-title class="d-flex align-center">
      AWS Accounts
      <v-spacer></v-spacer>
      <v-btn color="primary" @click="dialog = true">
        Add Account
      </v-btn>
    </v-card-title>

    <v-card-text>
      <v-table>
        <thead>
          <tr>
            <th>Account Name</th>
            <th>Account ID</th>
            <th>Regions</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="account in store.accounts" :key="account.id">
            <td>{{ account.accountName }}</td>
            <td>{{ account.accountId }}</td>
            <td>
              <v-chip
                v-for="region in account.regions"
                :key="region.id"
                :color="region.enabled ? 'green' : 'grey'"
                class="mr-1"
                @click="toggleRegion(account.id, region)"
              >
                {{ region.region }}
              </v-chip>
            </td>
            <td>
              <v-btn
                color="primary"
                variant="text"
                @click="selectAccount(account.id)"
              >
                View Findings
              </v-btn>
              <v-btn
                color="warning"
                variant="text"
                @click="triggerScan(account.id)"
                :loading="store.loading"
              >
                Scan Now
              </v-btn>
              <v-btn
                color="error"
                variant="text"
                @click="confirmDelete(account)"
                :disabled="store.loading"
              >
                Delete
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>

    <!-- Add Account Dialog -->
    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title>Add AWS Account</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="addAccount">
            <v-text-field
              v-model="newAccount.accountName"
              label="Account Name"
              required
            ></v-text-field>
            <v-text-field
              v-model="newAccount.accountId"
              label="Account ID"
              required
            ></v-text-field>
            <v-text-field
              v-model="newAccount.accessKeyId"
              label="Access Key ID"
              required
            ></v-text-field>
            <v-text-field
              v-model="newAccount.secretAccessKey"
              label="Secret Access Key"
              type="password"
              required
            ></v-text-field>
            <v-text-field
              v-model="newAccount.sessionToken"
              label="Session Token (Optional)"
              type="password"
            ></v-text-field>
            <v-select
              v-model="newAccount.regions"
              :items="availableRegions"
              label="Regions"
              multiple
              chips
            ></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="addAccount" :loading="store.loading">
            Add Account
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h5">Delete Account</v-card-title>
        <v-card-text>
          Are you sure you want to delete account "{{ accountToDelete?.accountName }}"? 
          This will also delete all findings and regions associated with this account.
          This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn 
            color="error" 
            variant="flat" 
            @click="deleteAccount"
            :loading="store.loading"
          >
            Delete Account
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSecurityStore } from '../store';
import { AWSAccount } from '../../src/db/schema';

const store = useSecurityStore();
const dialog = ref(false);
const deleteDialog = ref(false);
const accountToDelete = ref<AWSAccount | null>(null);
const newAccount = ref({
  accountName: '',
  accountId: '',
  accessKeyId: '',
  secretAccessKey: '',
  sessionToken: '',
  regions: [],
});

const availableRegions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
];

async function addAccount() {
  await store.addAccount(newAccount.value);
  dialog.value = false;
  newAccount.value = {
    accountName: '',
    accountId: '',
    accessKeyId: '',
    secretAccessKey: '',
    sessionToken: '',
    regions: [],
  };
}

async function toggleRegion(accountId: number, region: any) {
  await store.updateRegion(accountId, region.id, !region.enabled);
}

function selectAccount(accountId: number) {
  store.setSelectedAccount(accountId);
}

async function triggerScan(accountId: number) {
  await store.triggerScan(accountId);
}

const confirmDelete = (account: AWSAccount) => {
  accountToDelete.value = account;
  deleteDialog.value = true;
};

const deleteAccount = async () => {
  if (accountToDelete.value) {
    await store.deleteAccount(accountToDelete.value.id);
    deleteDialog.value = false;
    accountToDelete.value = null;
  }
};
</script>
