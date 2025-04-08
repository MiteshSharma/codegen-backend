export interface FileOperations {
    writeFile(projectPath: string, filePath: string, content: string): Promise<void>;
    readFile(projectPath: string, filePath: string): Promise<string>;
    deleteFile(projectPath: string, filePath: string): Promise<void>;
    listFiles(projectPath: string, pattern?: string): Promise<string[]>;
  }