const pool = require("../database/db");

const getDashboardStats = async () => {
    const [[users]] = await pool.query(
        `SELECT COUNT(*) AS total_users
         FROM users`
    );

    const [[students]] = await pool.query(
        `SELECT COUNT(*) AS total_students
         FROM users u
         JOIN roles r
             ON u.role_id = r.role_id
         WHERE r.role_name = 'STUDENT'`
    );

    const [[faculty]] = await pool.query(
        `SELECT COUNT(*) AS total_faculty
         FROM users u
         JOIN roles r
             ON u.role_id = r.role_id
         WHERE r.role_name = 'FACULTY'`
    );

    const [[clubs]] = await pool.query(
        `SELECT COUNT(*) AS total_clubs
         FROM users u
         JOIN roles r
             ON u.role_id = r.role_id
         WHERE r.role_name = 'CLUB'`
    );

    const [[opportunities]] = await pool.query(
        `SELECT COUNT(*) AS total_opportunities
         FROM opportunities`
    );

    const [[verifiedOpportunities]] = await pool.query(
        `SELECT COUNT(*) AS verified_opportunities
         FROM opportunities
         WHERE is_verified = TRUE`
    );

    return {
        totalUsers: Number(users.total_users),
        totalStudents: Number(students.total_students),
        totalFaculty: Number(faculty.total_faculty),
        totalClubs: Number(clubs.total_clubs),
        totalOpportunities: Number(
            opportunities.total_opportunities
        ),
        verifiedOpportunities: Number(
            verifiedOpportunities.verified_opportunities
        )
    };
};


const getAllUsers = async (
    search = "",
    role = ""
) => {
    let query = `
        SELECT
            u.user_id,
            u.college_id,
            u.full_name,
            u.email,
            u.department,
            u.year,
            u.section,
            r.role_name,
            u.is_active,
            u.created_at
        FROM users u
        JOIN roles r
            ON u.role_id = r.role_id
        WHERE 1 = 1
    `;

    const params = [];

    if (search) {
        query += `
            AND (
                u.full_name LIKE ?
                OR u.email LIKE ?
                OR CAST(u.college_id AS CHAR) LIKE ?
            )
        `;

        const searchValue = `%${search}%`;

        params.push(
            searchValue,
            searchValue,
            searchValue
        );
    }

    if (role) {
        query += ` AND r.role_name = ?`;
        params.push(role);
    }

    query += ` ORDER BY u.created_at DESC`;

    const [users] = await pool.query(
        query,
        params
    );

    return users;
};


const getAllRoles = async () => {
    const [roles] = await pool.query(
        `SELECT role_id, role_name
         FROM roles
         ORDER BY role_id`
    );

    return roles;
};


const createManagedUser = async (user) => {
    const {
        collegeId,
        fullName,
        email,
        passwordHash,
        department,
        year,
        section,
        roleId
    } = user;

    const [result] = await pool.query(
        `INSERT INTO users
        (
            college_id,
            full_name,
            email,
            password_hash,
            department,
            year,
            section,
            role_id,
            first_login,
            is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE)`,
        [
            collegeId,
            fullName,
            email,
            passwordHash,
            department,
            year,
            section,
            roleId
        ]
    );

    const [rows] = await pool.query(
        `SELECT
            u.user_id,
            u.college_id,
            u.full_name,
            u.email,
            u.department,
            u.year,
            u.section,
            r.role_name,
            u.first_login,
            u.is_active,
            u.created_at
         FROM users u
         JOIN roles r ON u.role_id = r.role_id
         WHERE u.user_id = ?`,
        [result.insertId]
    );

    return rows[0];
};


const getAllOpportunities = async () => {
    const [opportunities] = await pool.query(
        `SELECT
            o.opportunity_id,
            o.title,
            o.description,
            o.organization,
            o.opportunity_type,
            o.location,
            o.mode,
            o.deadline,
            o.application_link,
            o.is_verified,
            o.created_by,
            o.created_at
         FROM opportunities o
         ORDER BY o.created_at DESC`
    );

    return opportunities;
};


/*
    ADMIN - GET ALL NOTICES

    Returns:
    - notice information
    - admin information
    - HOD review information
*/
const getAllNotices = async () => {
    const [rows] = await pool.query(
        `SELECT
            n.notice_id,
            n.title,
            n.content,
            n.status,
            n.published_at,
            n.created_at,

            creator.user_id AS created_by,
            creator.full_name AS creator_name,
            creator.email AS creator_email,

            r.review_id,
            r.hod_id,
            hod.full_name AS hod_name,
            hod.department AS hod_department,
            r.status AS review_status,
            r.remarks,
            r.reviewed_at

         FROM notices n

         JOIN users creator
             ON n.created_by = creator.user_id

         LEFT JOIN notice_hod_reviews r
             ON n.notice_id = r.notice_id

         LEFT JOIN users hod
             ON r.hod_id = hod.user_id

         ORDER BY
            n.created_at DESC,
            r.created_at ASC`
    );

    const noticesMap = new Map();

    for (const row of rows) {

        if (!noticesMap.has(row.notice_id)) {
            noticesMap.set(row.notice_id, {
                notice_id: row.notice_id,
                title: row.title,
                content: row.content,
                status: row.status,
                published_at: row.published_at,
                created_at: row.created_at,

                created_by: row.created_by,
                creator_name: row.creator_name,
                creator_email: row.creator_email,

                reviews: []
            });
        }

        if (row.review_id) {
            noticesMap.get(row.notice_id).reviews.push({
                review_id: row.review_id,
                hod_id: row.hod_id,
                hod_name: row.hod_name,
                hod_department: row.hod_department,
                status: row.review_status,
                remarks: row.remarks,
                reviewed_at: row.reviewed_at
            });
        }
    }

    return Array.from(
        noticesMap.values()
    );
};


/*
    OLD NOTICE VERIFICATION

    Kept for compatibility with existing code.
*/
const updateNoticeVerification = async (
    postId,
    isVerified
) => {
    const [result] = await pool.query(
        `UPDATE posts
         SET is_verified = ?
         WHERE post_id = ?
         AND post_type = 'NOTICE'`,
        [
            isVerified,
            postId
        ]
    );

    return result;
};


/*
    ADMIN - GET HODS
*/
const getHODs = async () => {
    const [hods] = await pool.query(
        `SELECT
            u.user_id,
            u.college_id,
            u.full_name,
            u.email,
            u.department
         FROM users u
         JOIN roles r
             ON u.role_id = r.role_id
         WHERE r.role_name = 'HOD'
         AND u.is_active = TRUE
         ORDER BY u.full_name`
    );

    return hods;
};


/*
    ADMIN - CREATE NOTICE
*/
const createNotice = async (
    title,
    content,
    createdBy,
    hodIds
) => {
    const connection =
        await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [noticeResult] =
            await connection.query(
                `INSERT INTO notices
                (
                    title,
                    content,
                    created_by,
                    status
                )
                VALUES (
                    ?,
                    ?,
                    ?,
                    'PENDING_APPROVAL'
                )`,
                [
                    title,
                    content,
                    createdBy
                ]
            );

        const noticeId =
            noticeResult.insertId;

        for (const hodId of hodIds) {
            await connection.query(
                `INSERT INTO notice_hod_reviews
                (
                    notice_id,
                    hod_id,
                    status
                )
                VALUES (
                    ?,
                    ?,
                    'PENDING'
                )`,
                [
                    noticeId,
                    hodId
                ]
            );
        }

        await connection.commit();

        return {
            noticeId
        };

    } catch (error) {

        await connection.rollback();
        throw error;

    } finally {

        connection.release();
    }
};


/*
    ADMIN - UPDATE NOTICE

    Used when Admin edits:
    - REJECTED notice
    - APPROVED notice

    Any edit invalidates previous HOD approvals.
*/
const updateNotice = async (
    noticeId,
    title,
    content
) => {
    const connection =
        await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [result] =
            await connection.query(
                `UPDATE notices
                 SET
                    title = ?,
                    content = ?,
                    status = 'PENDING_APPROVAL',
                    published_at = NULL
                 WHERE notice_id = ?
                 AND status != 'PUBLISHED'`,
                [
                    title,
                    content,
                    noticeId
                ]
            );

        if (
            result.affectedRows === 0
        ) {
            throw new Error(
                "Notice not found or already published"
            );
        }

        /*
            Reset every HOD review.
        */
        await connection.query(
            `UPDATE notice_hod_reviews
             SET
                status = 'PENDING',
                remarks = NULL,
                reviewed_at = NULL
             WHERE notice_id = ?`,
            [noticeId]
        );

        await connection.commit();

        return result;

    } catch (error) {

        await connection.rollback();
        throw error;

    } finally {

        connection.release();
    }
};


/*
    ADMIN - PUBLISH NOTICE

    Only APPROVED notices can be published.
*/
const publishNotice = async (
    noticeId
) => {
    const connection =
        await pool.getConnection();

    try {
        await connection.beginTransaction();

        /*
            Lock the notice while publishing.
        */
        const [noticeRows] =
            await connection.query(
                `SELECT
                    status
                 FROM notices
                 WHERE notice_id = ?
                 FOR UPDATE`,
                [noticeId]
            );

        if (
            noticeRows.length === 0
        ) {
            throw new Error(
                "Notice not found"
            );
        }

        /*
            Admin can publish only
            an APPROVED notice.
        */
        if (
            noticeRows[0].status !==
            "APPROVED"
        ) {
            throw new Error(
                "Only approved notices can be published"
            );
        }

        /*
            Double-check all HOD reviews.
        */
        const [pendingReviews] =
            await connection.query(
                `SELECT
                    review_id
                 FROM notice_hod_reviews
                 WHERE notice_id = ?
                 AND status != 'APPROVED'`,
                [noticeId]
            );

        if (
            pendingReviews.length > 0
        ) {
            throw new Error(
                "All HOD approvals are required before publishing"
            );
        }

        /*
            Finally publish.
        */
        await connection.query(
            `UPDATE notices
             SET
                status = 'PUBLISHED',
                published_at = CURRENT_TIMESTAMP
             WHERE notice_id = ?`,
            [noticeId]
        );

        await connection.commit();

        return {
            success: true
        };

    } catch (error) {

        await connection.rollback();
        throw error;

    } finally {

        connection.release();
    }
};


module.exports = {
    getDashboardStats,
    getAllUsers,
    getAllRoles,
    createManagedUser,
    getAllOpportunities,
    getAllNotices,
    updateNoticeVerification,
    getHODs,
    createNotice,
    updateNotice,
    publishNotice
};