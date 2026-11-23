
const conversationModel = require("../models/conversationModel");
const messageModel = require("../models/messageModel");

const createConversation = async (req, res) => {
    try {
        const recipientId = Number(req.body.recipientId);
        const userId = Number(req.user.userId);

        if (!Number.isSafeInteger(recipientId) || recipientId <= 0) {
            return res.status(400).json({
                message: "A valid recipientId is required"
            });
        }

        if (recipientId === userId) {
            return res.status(400).json({
                message: "You cannot start a conversation with yourself"
            });
        }

        const conversation =
            await conversationModel.createConversation(
                userId,
                recipientId
            );

        return res.status(200).json({ conversation });
    } catch (error) {
        console.error("CREATE CONVERSATION ERROR:", error);

        return res.status(400).json({
            message: error.message || "Unable to create conversation"
        });
    }
};

const getConversations = async (req, res) => {
    try {
        const conversations =
            await conversationModel.getUserConversations(
                Number(req.user.userId)
            );

        return res.status(200).json({ conversations });
    } catch (error) {
        console.error("GET CONVERSATIONS ERROR:", error);

        return res.status(500).json({
            message: "Unable to load conversations"
        });
    }
};

const getMessages = async (req, res) => {
    try {
        const conversationId = Number(req.params.id);
        const userId = Number(req.user.userId);

        if (!Number.isSafeInteger(conversationId) || conversationId <= 0) {
            return res.status(400).json({
                message: "Invalid conversation ID"
            });
        }

        const conversation =
            await conversationModel.getConversationForUser(
                conversationId,
                userId
            );

        if (!conversation) {
            return res.status(404).json({
                message: "Conversation not found"
            });
        }

        const messages = await messageModel.getMessages(conversationId);

        return res.status(200).json({ messages });
    } catch (error) {
        console.error("GET MESSAGES ERROR:", error);

        return res.status(500).json({
            message: "Unable to load messages"
        });
    }
};

const sendMessage = async (req, res) => {
    try {
        const conversationId = Number(req.params.id);
        const senderId = Number(req.user.userId);
        const messageText = req.body.messageText;

        if (!Number.isSafeInteger(conversationId) || conversationId <= 0) {
            return res.status(400).json({
                message: "Invalid conversation ID"
            });
        }

        if (typeof messageText !== "string" || !messageText.trim()) {
            return res.status(400).json({
                message: "Message cannot be empty"
            });
        }

        const trimmedMessage = messageText.trim();

        if (trimmedMessage.length > 4000) {
            return res.status(400).json({
                message: "Message cannot exceed 4000 characters"
            });
        }

        const conversation =
            await conversationModel.getConversationForUser(
                conversationId,
                senderId
            );

        if (!conversation) {
            return res.status(404).json({
                message: "Conversation not found"
            });
        }

        const message = await messageModel.createMessage(
            conversationId,
            senderId,
            trimmedMessage
        );

        return res.status(201).json({
            message: "Message sent successfully",
            data: message
        });
    } catch (error) {
        console.error("SEND MESSAGE ERROR:", error);

        return res.status(500).json({
            message: "Unable to send message"
        });
    }
};


const getAvailableUsers = async (req, res) => {
    try {
        const users = await conversationModel.getAvailableUsers(
            Number(req.user.userId)
        );

        return res.status(200).json({ users });
    } catch (error) {
        console.error("GET CHAT USERS ERROR:", error);

        return res.status(500).json({
            message: "Unable to load users"
        });
    }
};

module.exports = {
    createConversation,
    getConversations,
    getMessages,
    sendMessage,
    getAvailableUsers
};
