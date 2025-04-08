import { Router } from "express";
import { BranchController } from "../controllers/branch.controller";

export const branchRoutes = Router();
const controller = new BranchController();

branchRoutes.post("/", controller.createBranch);
branchRoutes.get("/conversation/:conversationId", controller.getBranchesByConversation);
branchRoutes.put("/:branchId/default", controller.setDefaultBranch);
branchRoutes.get("/:branchId/messages", controller.getMessagesForBranch); 
