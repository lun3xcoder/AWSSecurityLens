import { defineStore } from 'pinia';

interface NotificationState {
  message: string | null;
  type: 'success' | 'error' | 'info' | 'warning';
  show: boolean;
}

export const useNotificationStore = defineStore('notification', {
  state: (): NotificationState => ({
    message: null,
    type: 'info',
    show: false,
  }),

  actions: {
    showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
      this.message = message;
      this.type = type;
      this.show = true;
    },

    hideNotification() {
      this.show = false;
    },

    showError(message: string) {
      this.showNotification(message, 'error');
    },

    showSuccess(message: string) {
      this.showNotification(message, 'success');
    },
  },
});
