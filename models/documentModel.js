
const pool = require("../database/db");

// Get authorities configured for a service and student's academic department
const getAuthoritiesForDepartment = async (
    connection,
    department,
    academicDepartment,
    stages
) => {
    const placeholders = stages.map(() => "?").join(", ");

    const [rows] = await connection.query(
        `SELECT da.authority_type, da.user_id
         FROM document_authorities da
         JOIN users u ON u.user_id = da.user_id
         WHERE da.service_department = ?
           AND da.authority_type IN (${placeholders})
           AND da.is_active = TRUE
           AND u.is_active = TRUE
           AND (
                (da.authority_type = 'HOD'
                    AND da.academic_department = ?)
                OR
                (da.authority_type <> 'HOD'
                    AND da.academic_department IS NULL)
           )`,
        [department, ...stages, academicDepartment]
    );

    return rows;
};

// Get the student's academic department directly from the database
const getStudentAcademicDepartment = async (connection, studentId) => {
    const [rows] = await connection.query(
        `SELECT department
         FROM users
         WHERE user_id = ?
           AND role_id = 1
           AND is_active = TRUE`,
        [studentId]
    );

    if (!rows.length || !rows[0].department) {
        const error = new Error(
            "Student academic department is not configured"
        );
        error.code = "STUDENT_DEPARTMENT_MISSING";
        throw error;
    }

    return rows[0].department;
};

// Create a new document request
const createRequest = async ({
    studentId,
    department,
    purpose,
    file,
    stages
}) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const academicDepartment = await getStudentAcademicDepartment(
            connection,
            studentId
        );

        const authorities = await getAuthoritiesForDepartment(
            connection,
            department,
            academicDepartment,
            stages
        );

        const authorityByStage = new Map(
            authorities.map((authority) => [
                authority.authority_type,
                authority.user_id
            ])
        );

        const missingStages = stages.filter(
            (stage) => !authorityByStage.has(stage)
        );

        if (missingStages.length) {
            const error = new Error(
                `Authority assignment missing for: ${missingStages.join(", ")}`
            );
            error.code = "AUTHORITY_NOT_CONFIGURED";
            throw error;
        }

        const [requestResult] = await connection.query(
            `INSERT INTO document_requests
                (student_id, service_department, purpose, status, current_stage, current_cycle)
             VALUES (?, ?, ?, 'PENDING_APPROVAL', ?, 1)`,
            [studentId, department, purpose, stages[0]]
        );

        const requestId = requestResult.insertId;

        await connection.query(
            `INSERT INTO document_files
                (request_id, cycle_number, original_file_name, stored_file_name,
                 file_path, file_size, uploaded_by)
             VALUES (?, 1, ?, ?, ?, ?, ?)`,
            [
                requestId,
                file.originalname,
                file.filename,
                file.path,
                file.size,
                studentId
            ]
        );

        for (let index = 0; index < stages.length; index += 1) {
            const stage = stages[index];

            await connection.query(
                `INSERT INTO document_approval_steps
                    (request_id, cycle_number, stage, sequence_number, approver_id, status)
                 VALUES (?, 1, ?, ?, ?, ?)`,
                [
                    requestId,
                    stage,
                    index + 1,
                    authorityByStage.get(stage),
                    index === 0 ? "PENDING" : "WAITING"
                ]
            );
        }

        await connection.commit();

        return {
            requestId,
            firstApproverId: authorityByStage.get(stages[0]),
            currentStage: stages[0]
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// Get all document requests submitted by a student
const getMyRequests = async (studentId) => {
    const [rows] = await pool.query(
        `SELECT
            d.request_id,
            d.service_department,
            d.purpose,
            d.status,
            d.current_stage,
            d.current_cycle,
            d.created_at,
            d.updated_at,
            f.original_file_name,
            f.file_size
         FROM document_requests d
         LEFT JOIN document_files f
           ON f.request_id = d.request_id
          AND f.cycle_number = d.current_cycle
         WHERE d.student_id = ?
         ORDER BY d.created_at DESC`,
        [studentId]
    );

    return rows;
};

// Get pending requests assigned to an authority
const getPendingRequests = async (approverId) => {
    const [rows] = await pool.query(
        `SELECT
            d.request_id,
            d.service_department,
            d.purpose,
            d.current_stage,
            d.current_cycle,
            d.created_at,
            f.original_file_name,
            f.file_size,
            student.user_id AS student_user_id,
            student.college_id AS student_college_id,
            student.full_name AS student_name,
            s.step_id
         FROM document_approval_steps s
         JOIN document_requests d ON d.request_id = s.request_id
         JOIN document_files f
           ON f.request_id = d.request_id
          AND f.cycle_number = d.current_cycle
         JOIN users student ON student.user_id = d.student_id
         WHERE s.approver_id = ?
           AND s.cycle_number = d.current_cycle
           AND s.status = 'PENDING'
           AND d.status = 'PENDING_APPROVAL'
         ORDER BY d.created_at ASC`,
        [approverId]
    );

    return rows;
};

// Get request details for its student or an assigned approver
const getRequestDetailsForUser = async (requestId, userId) => {
    const [requests] = await pool.query(
        `SELECT
            d.request_id,
            d.student_id,
            d.service_department,
            d.purpose,
            d.status,
            d.current_stage,
            d.current_cycle,
            d.created_at,
            d.updated_at,
            student.full_name AS student_name,
            student.college_id AS student_college_id
         FROM document_requests d
         JOIN users student ON student.user_id = d.student_id
         WHERE d.request_id = ?
           AND (
                d.student_id = ?
                OR EXISTS (
                    SELECT 1
                    FROM document_approval_steps access_step
                    WHERE access_step.request_id = d.request_id
                      AND access_step.approver_id = ?
                )
           )`,
        [requestId, userId, userId]
    );

    if (!requests.length) {
        return null;
    }

    const [files] = await pool.query(
        `SELECT
            file_id,
            cycle_number,
            original_file_name,
            file_size,
            uploaded_by,
            created_at
         FROM document_files
         WHERE request_id = ?
         ORDER BY cycle_number DESC`,
        [requestId]
    );

    const [steps] = await pool.query(
        `SELECT
            s.step_id,
            s.cycle_number,
            s.stage,
            s.sequence_number,
            s.approver_id,
            approver.full_name AS approver_name,
            s.status,
            s.remarks,
            s.acted_at,
            s.created_at
         FROM document_approval_steps s
         JOIN users approver ON approver.user_id = s.approver_id
         WHERE s.request_id = ?
         ORDER BY s.cycle_number DESC, s.sequence_number ASC`,
        [requestId]
    );

    return {
        ...requests[0],
        files,
        approvalHistory: steps
    };
};

// Get the latest document file for the student or an assigned approver
const getLatestFileForUser = async (requestId, userId) => {
    const [rows] = await pool.query(
        `SELECT f.file_path, f.original_file_name
         FROM document_files f
         JOIN document_requests d ON d.request_id = f.request_id
         WHERE d.request_id = ?
           AND f.cycle_number = d.current_cycle
           AND (
                d.student_id = ?
                OR EXISTS (
                    SELECT 1
                    FROM document_approval_steps access_step
                    WHERE access_step.request_id = d.request_id
                      AND access_step.approver_id = ?
                )
           )
         LIMIT 1`,
        [requestId, userId, userId]
    );

    return rows[0] || null;
};

// Approve, reject or request corrections
const decideRequest = async ({
    requestId,
    approverId,
    decision,
    remarks
}) => {
    const allowedDecisions = [
        "APPROVED",
        "REJECTED",
        "CORRECTION_REQUESTED"
    ];

    if (!allowedDecisions.includes(decision)) {
        const error = new Error("Invalid approval decision");
        error.code = "INVALID_DECISION";
        throw error;
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [requestRows] = await connection.query(
            `SELECT
                request_id,
                student_id,
                service_department,
                current_cycle,
                status
             FROM document_requests
             WHERE request_id = ?
             FOR UPDATE`,
            [requestId]
        );

        if (!requestRows.length) {
            const error = new Error("Document request not found");
            error.code = "NOT_FOUND";
            throw error;
        }

        const request = requestRows[0];

        if (request.status !== "PENDING_APPROVAL") {
            const error = new Error(
                "This request is not awaiting approval"
            );
            error.code = "CONFLICT";
            throw error;
        }

        const [stepRows] = await connection.query(
            `SELECT step_id, sequence_number, stage
             FROM document_approval_steps
             WHERE request_id = ?
               AND cycle_number = ?
               AND approver_id = ?
               AND status = 'PENDING'
             FOR UPDATE`,
            [requestId, request.current_cycle, approverId]
        );

        if (!stepRows.length) {
            const error = new Error(
                "No pending approval assigned to this user"
            );
            error.code = "FORBIDDEN";
            throw error;
        }

        const currentStep = stepRows[0];

        await connection.query(
            `UPDATE document_approval_steps
             SET status = ?, remarks = ?, acted_at = CURRENT_TIMESTAMP
             WHERE step_id = ?`,
            [decision, remarks || null, currentStep.step_id]
        );

        let nextApproverId = null;
        let nextStage = null;
        let newRequestStatus = "PENDING_APPROVAL";

        if (decision === "APPROVED") {
            const [nextRows] = await connection.query(
                `SELECT step_id, approver_id, stage
                 FROM document_approval_steps
                 WHERE request_id = ?
                   AND cycle_number = ?
                   AND sequence_number > ?
                   AND status = 'WAITING'
                 ORDER BY sequence_number ASC
                 LIMIT 1
                 FOR UPDATE`,
                [
                    requestId,
                    request.current_cycle,
                    currentStep.sequence_number
                ]
            );

            if (nextRows.length) {
                nextApproverId = nextRows[0].approver_id;
                nextStage = nextRows[0].stage;

                await connection.query(
                    `UPDATE document_approval_steps
                     SET status = 'PENDING'
                     WHERE step_id = ?`,
                    [nextRows[0].step_id]
                );

                await connection.query(
                    `UPDATE document_requests
                     SET current_stage = ?
                     WHERE request_id = ?`,
                    [nextStage, requestId]
                );

            } else {
                newRequestStatus = "APPROVED";

                await connection.query(
                    `UPDATE document_requests
                     SET status = 'APPROVED', current_stage = NULL
                     WHERE request_id = ?`,
                    [requestId]
                );
            }

        } else {
            newRequestStatus = decision;

            await connection.query(
                `UPDATE document_requests
                 SET status = ?, current_stage = ?
                 WHERE request_id = ?`,
                [decision, currentStep.stage, requestId]
            );
        }

        await connection.commit();

        return {
            studentId: request.student_id,
            nextApproverId,
            nextStage,
            status: newRequestStatus,
            stage: currentStep.stage
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// Resubmit a corrected document
const resubmitRequest = async ({
    requestId,
    studentId,
    file
}) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const academicDepartment = await getStudentAcademicDepartment(
            connection,
            studentId
        );

        const [requestRows] = await connection.query(
            `SELECT
                request_id,
                service_department,
                current_cycle,
                status
             FROM document_requests
             WHERE request_id = ?
               AND student_id = ?
             FOR UPDATE`,
            [requestId, studentId]
        );

        if (!requestRows.length) {
            const error = new Error("Document request not found");
            error.code = "NOT_FOUND";
            throw error;
        }

        const request = requestRows[0];

        if (request.status !== "CORRECTION_REQUESTED") {
            const error = new Error(
                "This request is not awaiting a corrected document"
            );
            error.code = "CONFLICT";
            throw error;
        }

        const stages = getStagesForDepartment(
            request.service_department
        );

        const authorities = await getAuthoritiesForDepartment(
            connection,
            request.service_department,
            academicDepartment,
            stages
        );

        const authorityByStage = new Map(
            authorities.map((authority) => [
                authority.authority_type,
                authority.user_id
            ])
        );

        const missingStages = stages.filter(
            (stage) => !authorityByStage.has(stage)
        );

        if (missingStages.length) {
            const error = new Error(
                `Authority assignment missing for: ${missingStages.join(", ")}`
            );
            error.code = "AUTHORITY_NOT_CONFIGURED";
            throw error;
        }

        const nextCycle = request.current_cycle + 1;

        await connection.query(
            `INSERT INTO document_files
                (request_id, cycle_number, original_file_name, stored_file_name,
                 file_path, file_size, uploaded_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                requestId,
                nextCycle,
                file.originalname,
                file.filename,
                file.path,
                file.size,
                studentId
            ]
        );

        for (let index = 0; index < stages.length; index += 1) {
            const stage = stages[index];

            await connection.query(
                `INSERT INTO document_approval_steps
                    (request_id, cycle_number, stage, sequence_number, approver_id, status)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    requestId,
                    nextCycle,
                    stage,
                    index + 1,
                    authorityByStage.get(stage),
                    index === 0 ? "PENDING" : "WAITING"
                ]
            );
        }

        await connection.query(
            `UPDATE document_requests
             SET status = 'PENDING_APPROVAL',
                 current_stage = ?,
                 current_cycle = ?
             WHERE request_id = ?`,
            [stages[0], nextCycle, requestId]
        );

        await connection.commit();

        return {
            firstApproverId: authorityByStage.get(stages[0]),
            currentStage: stages[0],
            cycle: nextCycle
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// Define approval hierarchy for each service
function getStagesForDepartment(department) {
    if (
        department === "ACADEMICS" ||
        department === "EXAMINATIONS"
    ) {
        return ["CAO", "HOD", "REGISTRAR"];
    }

    if (department === "HOSTEL") {
        return [
            "CHIEF_HOSTEL_WARDEN",
            "HOD",
            "REGISTRAR"
        ];
    }

    throw new Error("Invalid service department");
}

module.exports = {
    getStagesForDepartment,
    createRequest,
    getMyRequests,
    getPendingRequests,
    getRequestDetailsForUser,
    getLatestFileForUser,
    decideRequest,
    resubmitRequest
};
