
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const conversationModel = require("../models/conversationModel");
const messageModel = require("../models/messageModel");

const configureChatSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: [
                "http://localhost:5173",
                "http://localhost:5000"
            ],
            methods: ["GET", "POST"]
        }
    });

    // Authenticate every socket connection using the JWT.
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("Authentication required"));
        }

        try {
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            if (!decoded.userId) {
                return next(new Error("Invalid user token"));
            }

            socket.data.userId = Number(decoded.userId);
            next();
        } catch (error) {
            next(new Error("Invalid or expired token"));
        }
    });

    io.on("connection", (socket) => {
        console.log(
            `Chat socket connected: user ${socket.data.userId}`
        );

        // Join only conversations that belong to this user.
        socket.on("join_conversation", async (payload, acknowledge) => {
            try {
                const conversationId = Number(
                    payload?.conversationId
                );

                if (
                    !Number.isSafeInteger(conversationId) ||
                    conversationId <= 0
                ) {
                    throw new Error("Invalid conversation ID");
                }

                const conversation =
                    await conversationModel.getConversationForUser(
                        conversationId,
                        socket.data.userId
                    );

                if (!conversation) {
                    throw new Error("Conversation not found");
                }

                const room = `conversation:${conversationId}`;
                await socket.join(room);

                if (typeof acknowledge === "function") {
                    acknowledge({
                        success: true,
                        conversationId
                    });
                }
            } catch (error) {
                if (typeof acknowledge === "function") {
                    acknowledge({
                        success: false,
                        message: error.message
                    });
                }
            }
        });

        // Save first, then broadcast to authorized room members.
        socket.on("send_message", async (payload, acknowledge) => {
            try {
                const conversationId = Number(
                    payload?.conversationId
                );

                const messageText = payload?.messageText;

                if (
                    !Number.isSafeInteger(conversationId) ||
                    conversationId <= 0
                ) {
                    throw new Error("Invalid conversation ID");
                }

                if (
                    typeof messageText !== "string" ||
                    !messageText.trim()
                ) {
                    throw new Error("Message cannot be empty");
                }

                const trimmedMessage = messageText.trim();

                if (trimmedMessage.length > 4000) {
                    throw new Error(
                        "Message cannot exceed 4000 characters"
                    );
                }

                const conversation =
                    await conversationModel.getConversationForUser(
                        conversationId,
                        socket.data.userId
                    );

                if (!conversation) {
                    throw new Error("Conversation not found");
                }

                // The authenticated user is always the sender.
                const message = await messageModel.createMessage(
                    conversationId,
                    socket.data.userId,
                    trimmedMessage
                );

                io.to(`conversation:${conversationId}`).emit(
                    "new_message",
                    message
                );

                if (typeof acknowledge === "function") {
                    acknowledge({
                        success: true,
                        data: message
                    });
                }
            } catch (error) {
                if (typeof acknowledge === "function") {
                    acknowledge({
                        success: false,
                        message: error.message
                    });
                }
            }
        });

        socket.on("disconnect", () => {
            console.log(
                `Chat socket disconnected: user ${socket.data.userId}`
            );
        });
    });

    return io;
};

module.exports = configureChatSocket;
