<template>
  <v-snackbar
    v-model="notificationStore.show"
    :color="notificationStore.type"
    :timeout="5000"
    location="top"
    class="notification-snackbar"
  >
    <div class="d-flex align-center">
      <v-icon
        :icon="getIcon"
        class="mr-2"
      />
      {{ notificationStore.message }}
      <v-btn
        variant="text"
        @click="notificationStore.hideNotification"
        class="ml-auto"
      >
        Close
      </v-btn>
    </div>
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useNotificationStore } from '../store/notification';

const notificationStore = useNotificationStore();

const getIcon = computed(() => {
  switch (notificationStore.type) {
    case 'error':
      return 'mdi-alert-circle';
    case 'success':
      return 'mdi-check-circle';
    case 'warning':
      return 'mdi-alert';
    default:
      return 'mdi-information';
  }
});
</script>

<style scoped>
.notification-snackbar {
  z-index: 9999;
}
</style>
