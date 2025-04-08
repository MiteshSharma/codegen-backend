import { DeploymentResult, DeploymentStatus } from '../types/DeploymentTypes';

export interface Deployment {
  deploy(buildId: string, projectPath: string): Promise<DeploymentResult>;
  getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus>;
  getPreviewUrl(deploymentId: string): Promise<string>;
}