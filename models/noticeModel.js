const pool = require("../database/db");

const getPublishedNotices = async () => {
    const [notices] = await pool.query(
        `SELECT
            n.notice_id,
            n.title,
            n.content,
            n.published_at,
            n.created_at
         FROM notices n
         WHERE n.status = 'PUBLISHED'
         ORDER BY n.published_at DESC`
    );

    return notices;
};

module.exports = {
    getPublishedNotices
};