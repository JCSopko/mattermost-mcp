import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MonitoringConfig {
  enabled: boolean;
  schedule: string;
  channels: string[];
  topics: string[];
  messageLimit: number;
  userId?: string;
  notificationChannelId?: string;
}

export interface Config {
  mattermostUrl: string;
  token: string;
  teamId: string;
  monitoring?: MonitoringConfig;
}

export function loadConfig(): Config {
  try {
    // First try to load from config.local.json
    const localConfigPath = path.resolve(__dirname, '../config.local.json');

    // Check if local config exists
    if (fs.existsSync(localConfigPath)) {
      // Tolerate a UTF-8 BOM — Windows tools (e.g. PowerShell 5.1 Set-Content) emit one
      const configData = fs.readFileSync(localConfigPath, 'utf8').replace(/^\uFEFF/, '');
      const config = JSON.parse(configData) as Config;
      // Validate required fields
      validateConfig(config);
      return config;
    }

    // Fall back to config.json
    const configPath = path.resolve(__dirname, '../config.json');
    const configData = fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, '');
    const config = JSON.parse(configData) as Config;
    // Validate required fields
    validateConfig(config);
    return config;
  } catch (error) {
    console.error('Error loading configuration:', error);
    throw new Error('Failed to load configuration. Please ensure config.json or config.local.json exists and contains valid data.');
  }
}

// Helper function to validate config
function validateConfig(config: Config): void {
  if (!config.mattermostUrl) {
    throw new Error('Missing mattermostUrl in configuration');
  }
  if (!config.token) {
    throw new Error('Missing token in configuration');
  }
  if (!config.teamId) {
    throw new Error('Missing teamId in configuration');
  }

  // Validate monitoring config if enabled
  if (config.monitoring?.enabled) {
    if (!config.monitoring.schedule) {
      throw new Error('Missing schedule in monitoring configuration');
    }
    if (!config.monitoring.channels || config.monitoring.channels.length === 0) {
      throw new Error('No channels specified in monitoring configuration');
    }
    if (!config.monitoring.topics || config.monitoring.topics.length === 0) {
      throw new Error('No topics specified in monitoring configuration');
    }
    // userId and notificationChannelId are now optional
  }
}
