const hodModel = require("../models/hodModel");

const getPendingNotices = async (hodId) => {
    return await hodModel.getPendingNotices(hodId);
};

const updateNoticeReview = async (
    noticeId,
    hodId,
    status,
    remarks
) => {
    return await hodModel.updateNoticeReview(
        noticeId,
        hodId,
        status,
        remarks
    );
};

module.exports = {
    getPendingNotices,
    updateNoticeReview
};