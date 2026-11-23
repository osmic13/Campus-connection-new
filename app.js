const express = require("express");
const cors = require("cors");
const pool = require("./database/db");

const authRoutes = require("./routes/authRoutes");

const app = express();
const postRoutes = require("./routes/postRoutes");
const profileRoutes = require("./routes/profileRoutes");
const opportunityRoutes = require("./routes/opportunityRoutes");
const userSkillRoutes = require("./routes/userSkillRoutes");
const resumeRoutes =  require("./routes/resumeRoutes");
const skillRoutes = require("./routes/skillRoutes");
const chatRoutes = require("./routes/chatRoutes");
const adminRoutes = require("./routes/adminRoutes");
const hodRoutes = require("./routes/hodRoutes");
const documentRoutes = require("./routes/documentRoutes");
const noticeRoutes =
    require("./routes/noticeRoutes");
app.use(cors());
app.use(express.json());

app.get("/api/test", (req, res) => {
    res.json({
        message: "CampusConnect API is running"
    });
});

app.get("/api/db-test", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT 1 AS result");

        res.json({
            message: "Database connected successfully",
            result: rows[0].result
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Database connection failed"
        });
    }
});

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/opportunities", opportunityRoutes);
app.use("/api/user-skills", userSkillRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/hod", hodRoutes);
app.use("/api/documents", documentRoutes);
app.use(
    "/api/notices",
    noticeRoutes
);
module.exports = app;
