import express, { Express, Router } from "express";
import { registerMessageRoutes } from './routes/message.routes';
import { registerHealthRoutes } from './routes/health.routes';
import { registerConversationRoutes } from './routes/conversation.routes';

// Function type for route registration
export type RegisterRoutesFunction = (router: Router) => void;

export function registerRoutes(app: Express): void {

  // API routes
  const apiRouter = Router();
  
  // Register function-based routes to apiRouter
  registerHealthRoutes(apiRouter);
  registerMessageRoutes(apiRouter);
  registerConversationRoutes(apiRouter);
  
  
  // Mount the API router with all function-based routes
  app.use("/api", apiRouter);
}
