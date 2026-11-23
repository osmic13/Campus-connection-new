const adminService = require("../services/adminService");


const getDashboard = async (
    req,
    res
) => {
    try {
        const stats =
            await adminService.getDashboardStats();

        res.status(200).json({
            message:
                "Admin dashboard data fetched successfully",
            stats
        });

    } catch (error) {
        console.error(
            "ADMIN DASHBOARD ERROR:",
            error
        );

        res.status(500).json({
            message:
                "Unable to load admin dashboard"
        });
    }
};


const getAllUsers = async (
    req,
    res
) => {
    try {
        const search =
            req.query.search || "";

        const role =
            req.query.role || "";

        const users =
            await adminService.getAllUsers(
                search,
                role
            );

        res.status(200).json({
            message:
                "Users fetched successfully",
            users
        });

    } catch (error) {
        console.error(
            "ADMIN USERS ERROR:",
            error
        );

        res.status(500).json({
            message:
                "Unable to fetch users"
        });
    }
};


const getAllRoles = async (req, res) => {
    try {
        const roles = await adminService.getAllRoles();

        res.status(200).json({
            message: "Roles fetched successfully",
            roles
        });
    } catch (error) {
        console.error("ADMIN ROLES ERROR:", error);

        res.status(500).json({
            message: "Unable to fetch roles"
        });
    }
};


const createUser = async (req, res) => {
    try {
        const result = await adminService.createUser(req.body || {});

        res.status(201).json({
            message: "User created successfully. Share the temporary password securely; it will not be shown again.",
            user: result.user,
            temporaryPassword: result.temporaryPassword
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "A user with this college ID or email already exists"
            });
        }

        if (error.statusCode === 400) {
            return res.status(400).json({
                message: error.message
            });
        }

        console.error("ADMIN CREATE USER ERROR:", error);

        res.status(500).json({
            message: "Unable to create user"
        });
    }
};


const getAllOpportunities = async (
    req,
    res
) => {
    try {
        const opportunities =
            await adminService.getAllOpportunities();

        res.status(200).json({
            message:
                "Opportunities fetched successfully",
            opportunities
        });

    } catch (error) {
        console.error(
            "ADMIN OPPORTUNITIES ERROR:",
            error
        );

        res.status(500).json({
            message:
                "Unable to fetch opportunities"
        });
    }
};


/*
    GET ALL NOTICES
*/
const getAllNotices = async (
    req,
    res
) => {
    try {
        const notices =
            await adminService.getAllNotices();

        res.status(200).json({
            message:
                "Admin notices fetched successfully",
            notices
        });

    } catch (error) {
        console.error(
            "ADMIN NOTICES ERROR:",
            error
        );

        res.status(500).json({
            message:
                "Unable to load admin notices"
        });
    }
};


/*
    UPDATE OLD NOTICE VERIFICATION
    Kept for compatibility.
*/
const updateNoticeVerification = async (
    req,
    res
) => {
    try {
        const postId =
            Number(req.params.postId);

        const {
            isVerified
        } = req.body;

        if (
            !Number.isInteger(postId)
        ) {
            return res.status(400).json({
                message:
                    "Invalid post ID"
            });
        }

        if (
            typeof isVerified !== "boolean" &&
            isVerified !== 0 &&
            isVerified !== 1
        ) {
            return res.status(400).json({
                message:
                    "isVerified must be true or false"
            });
        }

        const result =
            await adminService.updateNoticeVerification(
                postId,
                isVerified ? 1 : 0
            );

        if (
            result.affectedRows === 0
        ) {
            return res.status(404).json({
                message:
                    "Notice not found"
            });
        }

        res.status(200).json({
            message: isVerified
                ? "Notice verified successfully"
                : "Notice verification removed successfully"
        });

    } catch (error) {
        console.error(
            "ADMIN NOTICE VERIFICATION ERROR:",
            error
        );

        res.status(500).json({
            message:
                "Unable to update notice verification"
        });
    }
};


/*
    GET HODS
*/
const getHODs = async (
    req,
    res
) => {
    try {
        const hods =
            await adminService.getHODs();

        res.status(200).json({
            message:
                "HODs fetched successfully",
            hods
        });

    } catch (error) {
        console.error(
            "ADMIN HODS ERROR:",
            error
        );

        res.status(500).json({
            message:
                "Unable to fetch HODs"
        });
    }
};


/*
    CREATE NOTICE
*/
const createNotice = async (
    req,
    res
) => {
    try {
        const {
            title,
            content,
            hodIds
        } = req.body;

        if (
            !title ||
            !content
        ) {
            return res.status(400).json({
                message:
                    "Title and content are required"
            });
        }

        if (
            !Array.isArray(hodIds) ||
            hodIds.length === 0
        ) {
            return res.status(400).json({
                message:
                    "At least one HOD must be selected"
            });
        }

        const result =
            await adminService.createNotice(
                title.trim(),
                content.trim(),
                req.user.userId,
                hodIds
            );

        res.status(201).json({
            message:
                "Notice sent for HOD approval",
            noticeId:
                result.noticeId
        });

    } catch (error) {
        console.error(
            "ADMIN CREATE NOTICE ERROR:",
            error
        );

        res.status(500).json({
            message:
                "Unable to create notice"
        });
    }
};


/*
    UPDATE NOTICE

    Editing a notice resets
    all HOD approvals.
*/
const updateNotice = async (
    req,
    res
) => {
    try {
        const noticeId =
            Number(req.params.noticeId);

        const {
            title,
            content
        } = req.body;

        if (
            !Number.isInteger(noticeId)
        ) {
            return res.status(400).json({
                message:
                    "Invalid notice ID"
            });
        }

        if (
            !title ||
            !content
        ) {
            return res.status(400).json({
                message:
                    "Title and content are required"
            });
        }

        await adminService.updateNotice(
            noticeId,
            title.trim(),
            content.trim()
        );

        res.status(200).json({
            message:
                "Notice updated and sent for HOD approval"
        });

    } catch (error) {
        console.error(
            "ADMIN UPDATE NOTICE ERROR:",
            error
        );

        res.status(400).json({
            message:
                error.message ||
                "Unable to update notice"
        });
    }
};


/*
    PUBLISH NOTICE
*/
const publishNotice = async (
    req,
    res
) => {
    try {
        const noticeId =
            Number(req.params.noticeId);

        if (
            !Number.isInteger(noticeId)
        ) {
            return res.status(400).json({
                message:
                    "Invalid notice ID"
            });
        }

        await adminService.publishNotice(
            noticeId
        );

        res.status(200).json({
            message:
                "Notice published successfully"
        });

    } catch (error) {
        console.error(
            "ADMIN PUBLISH NOTICE ERROR:",
            error
        );

        res.status(400).json({
            message:
                error.message ||
                "Unable to publish notice"
        });
    }
};


module.exports = {
    getDashboard,
    getAllUsers,
    getAllRoles,
    createUser,
    getAllOpportunities,
    getAllNotices,
    updateNoticeVerification,
    getHODs,
    createNotice,
    updateNotice,
    publishNotice
};