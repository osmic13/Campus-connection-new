const pool = require("../database/db");

const getPendingNotices = async (hodId) => {
    const [notices] = await pool.query(
        `SELECT
            n.notice_id,
            n.title,
            n.content,
            n.status,
            n.created_at,
            u.full_name AS admin_name,
            u.email AS admin_email,
            r.status AS review_status,
            r.remarks,
            r.reviewed_at
         FROM notice_hod_reviews r
         JOIN notices n
             ON r.notice_id = n.notice_id
         JOIN users u
             ON n.created_by = u.user_id
         WHERE r.hod_id = ?
         AND r.status = 'PENDING'
         AND n.status = 'PENDING_APPROVAL'
         ORDER BY n.created_at DESC`,
        [hodId]
    );

    return notices;
};

const updateNoticeReview = async (
    noticeId,
    hodId,
    status,
    remarks
) => {
    const connection =
        await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [reviewResult] =
            await connection.query(
                `UPDATE notice_hod_reviews
                 SET
                    status = ?,
                    remarks = ?,
                    reviewed_at = CURRENT_TIMESTAMP
                 WHERE notice_id = ?
                 AND hod_id = ?
                 AND status = 'PENDING'`,
                [
                    status,
                    remarks || null,
                    noticeId,
                    hodId
                ]
            );

        if (
            reviewResult.affectedRows === 0
        ) {
            throw new Error(
                "Pending notice review not found"
            );
        }

        const [reviews] =
            await connection.query(
                `SELECT status
                 FROM notice_hod_reviews
                 WHERE notice_id = ?`,
                [noticeId]
            );

        const hasRejected =
            reviews.some(
                (review) =>
                    review.status === "REJECTED"
            );

        if (hasRejected) {

            await connection.query(
                `UPDATE notices
                 SET status = 'REJECTED'
                 WHERE notice_id = ?`,
                [noticeId]
            );

        } else {

            const allApproved =
                reviews.every(
                    (review) =>
                        review.status === "APPROVED"
                );

            if (allApproved) {

                await connection.query(
                    `UPDATE notices
                     SET status = 'APPROVED'
                     WHERE notice_id = ?`,
                    [noticeId]
                );

            } else {

                await connection.query(
                    `UPDATE notices
                     SET status = 'PENDING_APPROVAL'
                     WHERE notice_id = ?`,
                    [noticeId]
                );
            }
        }

        await connection.commit();

    } catch (error) {

        await connection.rollback();
        throw error;

    } finally {

        connection.release();
    }
};

module.exports = {
    getPendingNotices,
    updateNoticeReview
};