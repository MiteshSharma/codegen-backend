import { BuildStatus, BuildResult, BuildLog, BuildConfig } from "../types/BuildTypes";


export interface ProjectBuilder {
    build(config: BuildConfig, onLog: (log: BuildLog) => void): Promise<BuildResult>;
    getBuildStatus(buildId: string): Promise<BuildStatus>;
    cancelBuild(buildId: string): Promise<void>;
  }