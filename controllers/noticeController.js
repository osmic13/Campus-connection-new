const noticeModel = require("../models/noticeModel");

const getPublishedNotices = async (req, res) => {
    try {
        const notices =
            await noticeModel.getPublishedNotices();

        res.status(200).json({
            message:
                "Published notices fetched successfully",
            notices
        });
    } catch (error) {
        console.error(
            "PUBLISHED NOTICES ERROR:",
            error
        );

        res.status(500).json({
            message:
                "Unable to load published notices"
        });
    }
};

module.exports = {
    getPublishedNotices
};