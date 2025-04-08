export type BuildLogType = 'info' | 'error' | 'warning' | 'log' | 'success' | 'artifact';

export interface BuildConfig {
  projectId: string;
}

export interface BuildLog {
  type: BuildLogType;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export type BuildProgress = BuildLog;

export interface BuildResult {
  success: boolean;
  buildId: string;
  logs: BuildLog[];
  artifacts?: string[];
}

export interface BuildStatus {
  status: 'pending' | 'running' | 'completed' | 'failed';
  buildId: string;
}