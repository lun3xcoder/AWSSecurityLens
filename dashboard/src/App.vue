<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-app-bar-title>AWS Security Scanner Dashboard</v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn @click="refreshData" :loading="store.loading" icon>
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <NotificationSnackbar />
      <v-container fluid>
        <AccountManager />

        <!-- Summary Cards -->
        <v-row class="mt-4">
          <v-col cols="12" md="3">
            <v-card class="mx-auto" color="error" dark>
              <v-card-text>
                <div class="text-h4 mb-2">{{ highSeverity }}</div>
                <div class="text-subtitle-1">High Severity Issues</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="3">
            <v-card class="mx-auto" color="warning" dark>
              <v-card-text>
                <div class="text-h4 mb-2">{{ mediumSeverity }}</div>
                <div class="text-subtitle-1">Medium Severity Issues</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="3">
            <v-card class="mx-auto" color="info" dark>
              <v-card-text>
                <div class="text-h4 mb-2">{{ lowSeverity }}</div>
                <div class="text-subtitle-1">Low Severity Issues</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="3">
            <v-card class="mx-auto" color="primary" dark>
              <v-card-text>
                <div class="text-h4 mb-2">{{ totalAssets }}</div>
                <div class="text-subtitle-1">Total Assets</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Charts Row -->
        <v-row class="mt-4">
          <v-col cols="12" md="6">
            <v-card>
              <v-card-title>Issues by Severity</v-card-title>
              <v-card-text class="chart-container">
                <Doughnut 
                  v-if="severityChartData"
                  :data="severityChartData" 
                  :options="chartOptions"
                />
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card>
              <v-card-title>Issues by Service</v-card-title>
              <v-card-text class="chart-container">
                <Doughnut 
                  v-if="serviceChartData"
                  :data="serviceChartData" 
                  :options="chartOptions"
                />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Findings Table -->
        <v-row class="mt-4">
          <v-col cols="12">
            <v-card>
              <v-card-title>
                Security Findings
                <v-spacer></v-spacer>
                <v-text-field
                  v-model="search"
                  append-icon="mdi-magnify"
                  label="Search"
                  single-line
                  hide-details
                ></v-text-field>
              </v-card-title>
              <v-data-table
                :headers="headers"
                :items="store.findings"
                :search="search"
                :loading="store.loading"
                class="elevation-1"
              >
                <template v-slot:item.severity="{ item }">
                  <v-chip
                    :color="getSeverityColor(item.severity)"
                    text-color="white"
                    small
                  >
                    {{ item.severity }}
                  </v-chip>
                </template>
                <template v-slot:item.resourceName="{ item }">
                  <v-tooltip bottom>
                    <template v-slot:activator="{ on, attrs }">
                      <span v-bind="attrs" v-on="on">
                        {{ item.resourceName || item.resourceId }}
                      </span>
                    </template>
                    <span>{{ item.resourceId }}</span>
                  </v-tooltip>
                </template>
              </v-data-table>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSecurityStore } from './store';
import AccountManager from './components/AccountManager.vue';
import NotificationSnackbar from './components/NotificationSnackbar.vue';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'vue-chartjs';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const store = useSecurityStore();
const search = ref('');

const headers = [
  { title: 'Resource', key: 'resourceName', sortable: true },
  { title: 'Type', key: 'resourceType', sortable: true },
  { title: 'Service', key: 'service', sortable: true },
  { title: 'Severity', key: 'severity', sortable: true },
  { title: 'Finding', key: 'finding', sortable: true },
];

const highSeverity = computed(() => 
  store.findings.filter(f => f.severity === 'HIGH').length
);

const mediumSeverity = computed(() => 
  store.findings.filter(f => f.severity === 'MEDIUM').length
);

const lowSeverity = computed(() => 
  store.findings.filter(f => f.severity === 'LOW').length
);

const totalAssets = computed(() => 
  new Set(store.findings.map(f => f.resourceId)).size
);

const severityChartData = computed(() => ({
  labels: ['High', 'Medium', 'Low'],
  datasets: [{
    data: [highSeverity.value, mediumSeverity.value, lowSeverity.value],
    backgroundColor: ['#FF5252', '#FFA726', '#2196F3'],
  }],
}));

const serviceChartData = computed(() => {
  if (!store.stats?.byService || !Array.isArray(store.stats.byService)) {
    return {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [],
      }],
    };
  }
  
  return {
    labels: store.stats.byService.map(s => s.service),
    datasets: [{
      data: store.stats.byService.map(s => s.count),
      backgroundColor: [
        '#FF6384',
        '#36A2EB',
        '#FFCE56',
        '#4BC0C0',
        '#9966FF',
        '#FF9F40',
      ],
    }],
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
    },
  },
};

const getSeverityColor = (severity: string) => {
  const colors: { [key: string]: string } = {
    HIGH: 'error',
    MEDIUM: 'warning',
    LOW: 'info',
  };
  return colors[severity] || 'primary';
};

const refreshData = async () => {
  await store.fetchAccounts();
  await store.fetchFindings();
  await store.fetchStats();
};

onMounted(() => {
  refreshData();
});
</script>

<style>
.chart-container {
  position: relative;
  height: 300px;
}
</style>
