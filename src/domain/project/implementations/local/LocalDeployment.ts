import { Deployment } from '../../interfaces/Deployment';
import { DeploymentResult, DeploymentStatus } from '../../types/DeploymentTypes';

export class LocalDeployment implements Deployment {
  async deploy(buildId: string, projectPath: string): Promise<DeploymentResult> {
    return {
      success: true,
      deploymentId: `deploy-${buildId}`,
      previewUrl: `http://localhost:3000/preview/${buildId}`
    };
  }

  async getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus> {
    return 'completed';
  }

  async getPreviewUrl(deploymentId: string): Promise<string> {
    return `http://localhost:3000/preview/${deploymentId}`;
  }
}