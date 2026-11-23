require("dotenv").config();

const http = require("http");
const app = require("./app");
const configureChatSocket = require("./socket/chatSocket");

const PORT = 5000;

const httpServer = http.createServer(app);

const io = configureChatSocket(httpServer);

app.set("io", io);

httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(
        `CampusConnect API running on http://localhost:${PORT}`
    );
    console.log("Socket.IO chat server is ready");
});