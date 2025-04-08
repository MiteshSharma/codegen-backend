import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { ProjectBuilder } from '../../interfaces/ProjectBuilder';
import { BuildConfig, BuildProgress, BuildResult, BuildStatus } from '../../types/BuildTypes';
import { logger } from '../../../../utils/logger/winston-logger';

export class LocalProjectBuilder implements ProjectBuilder {
  private activeBuilds: Map<string, ChildProcess>;
  private generatedProjectsPath: string;

  constructor() {
    this.activeBuilds = new Map();
    this.generatedProjectsPath = path.join(process.cwd(), 'generated-projects');
  }

  async build(
    config: BuildConfig,
    onProgress: (progress: BuildProgress) => void
  ): Promise<BuildResult> {
    const buildId = Date.now().toString();
    const logs: BuildProgress[] = [];
    
    try {
      // Log build start
      const startLog: BuildProgress = {
        type: 'log',
        message: 'Starting build process',
        timestamp: new Date(),
        metadata: { buildId }
      };
      logs.push(startLog);
      onProgress(startLog);

      // Get project path
      const projectPath = path.join(this.generatedProjectsPath, config.projectId);

      // Run npm install
      await this.runCommand('npm install', {
        cwd: projectPath,
        onProgress: (log) => {
          logs.push(log);
          onProgress(log);
        }
      });

      // Run npm build
      await this.runCommand('npm run build', {
        cwd: projectPath,
        onProgress: (log) => {
          logs.push(log);
          onProgress(log);
        }
      });

      // Signal success
      const successLog: BuildProgress = {
        type: 'success',
        message: 'Build completed successfully',
        timestamp: new Date(),
        metadata: { buildId }
      };
      logs.push(successLog);
      onProgress(successLog);

      return {
        success: true,
        buildId,
        logs,
        artifacts: [`${projectPath}/build`]
      };

    } catch (error) {
      // Log error and return failure
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const errorLog: BuildProgress = {
        type: 'error',
        message: `Build failed: ${errorMessage}`,
        timestamp: new Date(),
        metadata: { buildId }
      };
      logs.push(errorLog);
      onProgress(errorLog);

      return {
        success: false,
        buildId,
        logs,
        artifacts: []
      };
    } finally {
      this.activeBuilds.delete(buildId);
    }
  }

  async getBuildStatus(buildId: string): Promise<BuildStatus> {
    const isActive = this.activeBuilds.has(buildId);
    return {
      buildId,
      status: isActive ? 'running' : 'completed'
    };
  }

  async cancelBuild(buildId: string): Promise<void> {
    const process = this.activeBuilds.get(buildId);
    if (process) {
      process.kill();
      this.activeBuilds.delete(buildId);
      logger.info(`Build ${buildId} cancelled`);
    }
  }

  async cleanup(buildId: string): Promise<void> {
    await this.cancelBuild(buildId);
    logger.info(`Cleanup completed for build ${buildId}`);
  }

  private runCommand(
    command: string,
    options: {
      cwd: string;
      onProgress: (progress: BuildProgress) => void;
    }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const { cwd, onProgress } = options;

      onProgress({
        type: 'log',
        message: `Running command: ${command}`,
        timestamp: new Date()
      });

      // Use cross-platform shell configuration
      const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
      const shellArgs = process.platform === 'win32' ? ['/c'] : ['-c'];

      const childProcess = spawn(shell, [...shellArgs, command], {
        cwd,
        env: {
          ...process.env,
          FORCE_COLOR: 'true', // Enable colored output
          CI: 'true', // Disable interactive prompts
          PATH: process.env.PATH // Ensure PATH is passed through
        },
        stdio: ['pipe', 'pipe', 'pipe'], // Enable all stdio
        shell: false // We're handling the shell explicitly
      });

      // Store the process for potential cancellation
      this.activeBuilds.set(Date.now().toString(), childProcess);

      // Handle stdout
      childProcess.stdout?.on('data', (data: Buffer) => {
        onProgress({
          type: 'log',
          message: data.toString(),
          timestamp: new Date()
        });
      });

      // Handle stderr
      childProcess.stderr?.on('data', (data: Buffer) => {
        onProgress({
          type: 'error',
          message: data.toString(),
          timestamp: new Date()
        });
      });

      // Handle process completion
      childProcess.on('close', (code: number | null) => {
        if (code === 0) {
          onProgress({
            type: 'log',
            message: `Command completed successfully: ${command}`,
            timestamp: new Date()
          });
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${command}`));
        }
      });

      // Handle process errors
      childProcess.on('error', (error: Error) => {
        onProgress({
          type: 'error',
          message: `Command error: ${error.message}`,
          timestamp: new Date()
        });
        reject(error);
      });
    });
  }
}