import { Router } from "express";
import { ConversationController } from "../controllers/conversation.controller";

export function registerConversationRoutes(router: Router): void {
  const conversationController = new ConversationController();

  /**
   * @swagger
   * /api/conversations:
   *   get:
   *     tags:
   *       - Conversations
   *     summary: Get all conversations
   *     description: Retrieves all conversations for the current user
   *     responses:
   *       200:
   *         description: List of conversations
   *       500:
   *         description: Server error
   */
  router.get("/conversations", conversationController.getConversations.bind(conversationController));

  /**
   * @swagger
   * /api/conversations/{conversationId}/messages:
   *   get:
   *     tags:
   *       - Conversations
   *     summary: Get conversation messages
   *     description: Retrieves all messages for a specific conversation
   *     parameters:
   *       - name: conversationId
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of messages
   *       404:
   *         description: Conversation not found
   *       500:
   *         description: Server error
   */
  router.get("/conversations/:conversationId/messages", conversationController.getConversationMessages.bind(conversationController));

  /**
   * @swagger
   * /api/conversations/{conversationId}/build-deploy:
   *   post:
   *     tags:
   *       - Conversations
   *     summary: Build and deploy conversation code
   *     description: Triggers the build and deployment process for the conversation's code
   *     parameters:
   *       - name: conversationId
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Build and deployment status
   *       404:
   *         description: Conversation not found
   *       500:
   *         description: Server error
   */
  router.post("/conversations/:conversationId/build-deploy", conversationController.buildDeploy.bind(conversationController));
}
