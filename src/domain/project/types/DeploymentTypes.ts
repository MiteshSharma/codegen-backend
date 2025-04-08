export type DeploymentStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface DeploymentResult {
    success: boolean;
    deploymentId: string;
    previewUrl?: string;
    error?: string;
}