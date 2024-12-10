<template>
  <div>
    <v-btn
      :loading="loading"
      :disabled="loading"
      color="primary"
      @click="triggerScan"
      class="scan-button"
    >
      <v-icon left>mdi-refresh</v-icon>
      Scan Account
    </v-btn>

    <!-- Error Alert -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      closable
      class="mt-3"
      @click:close="clearError"
    >
      <v-row align="center">
        <v-col class="grow">
          <div v-if="isCredentialError">
            <strong>AWS Credential Error</strong>
            <div class="mt-1">
              Your AWS credentials appear to be invalid or expired. Please check your:
              <ul class="mt-1">
                <li>Access Key ID</li>
                <li>Secret Access Key</li>
                <li>Session Token (if using temporary credentials)</li>
              </ul>
            </div>
          </div>
          <div v-else>
            {{ error }}
          </div>
        </v-col>
      </v-row>
    </v-alert>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSecurityStore } from '../store';

const props = defineProps<{
  accountId?: number;
}>();

const store = useSecurityStore();
const loading = ref(false);
const error = computed(() => store.error);

const isCredentialError = computed(() => {
  if (!error.value) return false;
  const errorLower = error.value.toLowerCase();
  return (
    errorLower.includes('credentials') ||
    errorLower.includes('unauthorized') ||
    errorLower.includes('forbidden') ||
    errorLower.includes('403')
  );
});

const triggerScan = async () => {
  try {
    loading.value = true;
    await store.triggerScan(props.accountId);
  } catch (err) {
    // Error handling is managed by the store
  } finally {
    loading.value = false;
  }
};

const clearError = () => {
  store.$patch({ error: null });
};
</script>

<style scoped>
.scan-button {
  min-width: 150px;
}
</style>
