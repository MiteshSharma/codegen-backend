export interface ProjectStorage {
    initializeProject(conversationId: string): Promise<void>;
    projectExists(conversationId: string): Promise<boolean>;
    getProjectPath(conversationId: string): Promise<string>;
    downloadProject(conversationId: string): Promise<void>;
    uploadProject(conversationId: string): Promise<void>;
  }