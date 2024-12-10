# AWS Security Lens

A comprehensive security scanning solution for AWS accounts that integrates with GuardDuty to identify and display security findings across multiple regions.

## Features

- **Multi-Account Support**: Manage and scan multiple AWS accounts
- **Multi-Region Scanning**: Configure and scan specific AWS regions for each account
- **Security Services Integration**:
  - AWS GuardDuty integration for threat detection
  - Support for additional security services can be easily added
- **Real-time Scanning**: Trigger scans on-demand for immediate security assessment
- **Interactive Dashboard**:
  - View and filter security findings
  - Statistics and charts for security insights
  - Account and region management
- **Credential Management**: Secure handling of AWS credentials
- **Error Handling**: Robust error handling with user-friendly notifications

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- SQLite
- AWS Account(s) with GuardDuty enabled
- AWS credentials with appropriate permissions

## Installation

1. Clone the repository:
   ```bash
   git clone [your-repo-url]
   cd aws-security-lens
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd dashboard
   npm install
   ```

4. Create a SQLite database:
   ```bash
   # The database will be created automatically when you first run the application
   ```

## Configuration

1. AWS Credentials:
   - You'll need to configure AWS credentials for each account you want to scan
   - Credentials can be added through the UI
   - Required permissions:
     - GuardDuty:ListDetectors
     - GuardDuty:GetFindings
     - GuardDuty:ListFindings

2. Regions:
   - Configure which regions to scan for each account through the UI
   - Regions can be enabled/disabled as needed

## Running the Application

1. Start the backend server:
   ```bash
   # In the root directory
   npm run dev
   ```

2. Start the frontend development server:
   ```bash
   # In the dashboard directory
   npm run dev
   ```

3. Access the application:
   - Backend API: http://localhost:3000
   - Frontend UI: http://localhost:8080

## Usage

1. **Adding an AWS Account**:
   - Click "Add Account" in the AWS Accounts section
   - Enter account details and AWS credentials
   - Select regions to scan

2. **Scanning for Security Findings**:
   - Click "Scan Now" for a specific account
   - View findings in the dashboard
   - Filter findings by severity, service, or region

3. **Managing Regions**:
   - Enable/disable regions for each account
   - Click on region chips to toggle their status

4. **Viewing Results**:
   - See statistics and charts for security findings
   - Filter and sort findings as needed
   - View detailed information for each finding

## Project Structure

```
.
├── src/                    # Backend source code
│   ├── api/               # API routes and controllers
│   ├── db/                # Database models and services
│   ├── scanner/           # AWS scanning logic
│   └── index.ts           # Main application entry
├── dashboard/             # Frontend Vue.js application
│   ├── src/              
│   │   ├── components/   # Vue components
│   │   ├── store/        # Pinia store
│   │   └── App.vue       # Root component
│   └── index.html        # HTML entry point
└── README.md             # This file
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- AWS SDK for JavaScript
- Vue.js and Vuetify for the frontend
- Express.js for the backend
- SQLite for data storage
