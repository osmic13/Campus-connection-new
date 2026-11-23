const hodService = require("../services/hodService");

const getPendingNotices = async (req, res) => {
    try {
        const notices =
            await hodService.getPendingNotices(
                req.user.userId
            );

        res.status(200).json({
            message: "Pending notices fetched successfully",
            notices
        });
    } catch (error) {
        console.error(
            "HOD PENDING NOTICES ERROR:",
            error
        );

        res.status(500).json({
            message: "Unable to fetch pending notices"
        });
    }
};

const updateNoticeReview = async (req, res) => {
    try {
        const { noticeId } = req.params;
        const { status, remarks } = req.body;

        if (
            status !== "APPROVED" &&
            status !== "REJECTED"
        ) {
            return res.status(400).json({
                message:
                    "Status must be APPROVED or REJECTED"
            });
        }

        if (
            status === "REJECTED" &&
            (!remarks || !remarks.trim())
        ) {
            return res.status(400).json({
                message:
                    "Rejection reason is required"
            });
        }

        await hodService.updateNoticeReview(
            noticeId,
            req.user.userId,
            status,
            remarks?.trim()
        );

        res.status(200).json({
            message:
                status === "APPROVED"
                    ? "Notice approved successfully"
                    : "Notice rejected successfully"
        });
    } catch (error) {
        console.error(
            "HOD NOTICE REVIEW ERROR:",
            error
        );

        res.status(500).json({
            message:
                error.message ||
                "Unable to update notice review"
        });
    }
};

module.exports = {
    getPendingNotices,
    updateNoticeReview
};