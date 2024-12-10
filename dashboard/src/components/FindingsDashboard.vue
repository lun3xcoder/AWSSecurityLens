<template>
  <div>
    <!-- Summary Cards -->
    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-card color="error">
          <v-card-text class="text-center">
            <div class="text-h4">{{ highSeverity }}</div>
            <div>High Severity</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="warning">
          <v-card-text class="text-center">
            <div class="text-h4">{{ mediumSeverity }}</div>
            <div>Medium Severity</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="info">
          <v-card-text class="text-center">
            <div class="text-h4">{{ lowSeverity }}</div>
            <div>Low Severity</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card>
          <v-card-text class="text-center">
            <div class="text-h4">{{ totalAssets }}</div>
            <div>Total Assets</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Charts Row -->
    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Findings by Service</v-card-title>
          <v-card-text>
            <DoughnutChart
              v-if="serviceChartData"
              :chartData="serviceChartData"
              :options="chartOptions"
            />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Findings by Severity</v-card-title>
          <v-card-text>
            <DoughnutChart
              v-if="severityChartData"
              :chartData="severityChartData"
              :options="chartOptions"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Findings Table -->
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

      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="store.findings"
          :search="search"
          :loading="store.loading"
        >
          <template v-slot:item.severity="{ item }">
            <v-chip
              :color="getSeverityColor(item.severity)"
              text-color="white"
            >
              {{ item.severity }}
            </v-chip>
          </template>

          <template v-slot:item.actions="{ item }">
            <v-btn
              color="primary"
              variant="text"
              @click="showFindingDetails(item)"
            >
              Details
            </v-btn>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Finding Details Dialog -->
    <v-dialog v-model="dialog" max-width="700px">
      <v-card v-if="selectedFinding">
        <v-card-title>Finding Details</v-card-title>
        <v-card-text>
          <v-list>
            <v-list-item>
              <v-list-item-title>Resource</v-list-item-title>
              <v-list-item-subtitle>
                {{ selectedFinding.resourceName || selectedFinding.resourceId }}
                ({{ selectedFinding.resourceType }})
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Service</v-list-item-title>
              <v-list-item-subtitle>{{ selectedFinding.service }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Finding</v-list-item-title>
              <v-list-item-subtitle>{{ selectedFinding.finding }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Description</v-list-item-title>
              <v-list-item-subtitle>{{ selectedFinding.description }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Remediation</v-list-item-title>
              <v-list-item-subtitle>{{ selectedFinding.remediation }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="dialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { DoughnutChart } from 'vue-chartjs';
import { useSecurityStore } from '../store';

const store = useSecurityStore();
const search = ref('');
const dialog = ref(false);
const selectedFinding = ref(null);

const headers = [
  { title: 'Resource', key: 'resourceName' },
  { title: 'Type', key: 'resourceType' },
  { title: 'Service', key: 'service' },
  { title: 'Severity', key: 'severity' },
  { title: 'Finding', key: 'finding' },
  { title: 'Actions', key: 'actions' },
];

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
};

const serviceChartData = computed(() => ({
  labels: store.stats?.byService.map(s => s.service) || [],
  datasets: [{
    data: store.stats?.byService.map(s => s.count) || [],
    backgroundColor: [
      '#FF6384',
      '#36A2EB',
      '#FFCE56',
      '#4BC0C0',
      '#9966FF',
      '#FF9F40',
    ],
  }],
}));

const severityChartData = computed(() => ({
  labels: store.stats?.bySeverity.map(s => s.severity) || [],
  datasets: [{
    data: store.stats?.bySeverity.map(s => s.count) || [],
    backgroundColor: {
      HIGH: '#FF6384',
      MEDIUM: '#FFCE56',
      LOW: '#36A2EB',
    },
  }],
}));

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

function getSeverityColor(severity: string) {
  const colors = {
    HIGH: 'error',
    MEDIUM: 'warning',
    LOW: 'info',
  };
  return colors[severity] || 'grey';
}

function showFindingDetails(finding: any) {
  selectedFinding.value = finding;
  dialog.value = true;
}

onMounted(async () => {
  await store.fetchFindings();
  await store.fetchStats();
});
</script>
