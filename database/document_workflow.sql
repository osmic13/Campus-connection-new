-- CampusConnect: Document Approval Workflow
-- Run this as a migration against the existing campusconnect database.
-- Do NOT rerun the original schema.sql to install this feature.

USE campusconnect;

CREATE TABLE IF NOT EXISTS document_authorities (
    authority_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    service_department ENUM('ACADEMICS', 'EXAMINATIONS', 'HOSTEL') NOT NULL,
    authority_type ENUM('DVO', 'CHIEF_HOSTEL_WARDEN', 'HOD', 'REGISTRAR') NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_document_authorities_user
        FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT uq_document_authority_department_type
        UNIQUE (service_department, authority_type),
    INDEX idx_document_authorities_user (user_id)
);

CREATE TABLE IF NOT EXISTS document_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    service_department ENUM('ACADEMICS', 'EXAMINATIONS', 'HOSTEL') NOT NULL,
    purpose VARCHAR(500) NOT NULL,
    status ENUM('PENDING_APPROVAL', 'CORRECTION_REQUESTED', 'REJECTED', 'APPROVED')
        NOT NULL DEFAULT 'PENDING_APPROVAL',
    current_stage ENUM('DVO', 'CHIEF_HOSTEL_WARDEN', 'HOD', 'REGISTRAR') NULL,
    current_cycle INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_document_requests_student
        FOREIGN KEY (student_id) REFERENCES users(user_id),
    INDEX idx_document_requests_student (student_id, created_at),
    INDEX idx_document_requests_status_stage (status, current_stage)
);

CREATE TABLE IF NOT EXISTS document_files (
    file_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    cycle_number INT NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    stored_file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT UNSIGNED NOT NULL,
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_document_files_request
        FOREIGN KEY (request_id) REFERENCES document_requests(request_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_document_files_uploader
        FOREIGN KEY (uploaded_by) REFERENCES users(user_id),
    CONSTRAINT uq_document_file_cycle UNIQUE (request_id, cycle_number),
    INDEX idx_document_files_request (request_id, cycle_number)
);

CREATE TABLE IF NOT EXISTS document_approval_steps (
    step_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    cycle_number INT NOT NULL,
    stage ENUM('DVO', 'CHIEF_HOSTEL_WARDEN', 'HOD', 'REGISTRAR') NOT NULL,
    sequence_number TINYINT UNSIGNED NOT NULL,
    approver_id INT NOT NULL,
    status ENUM('WAITING', 'PENDING', 'APPROVED', 'REJECTED', 'CORRECTION_REQUESTED')
        NOT NULL DEFAULT 'WAITING',
    remarks VARCHAR(1000) NULL,
    acted_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_document_steps_request
        FOREIGN KEY (request_id) REFERENCES document_requests(request_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_document_steps_approver
        FOREIGN KEY (approver_id) REFERENCES users(user_id),
    CONSTRAINT uq_document_step_cycle_stage
        UNIQUE (request_id, cycle_number, stage),
    INDEX idx_document_steps_inbox (approver_id, status),
    INDEX idx_document_steps_request (request_id, cycle_number, sequence_number)
);

-- Authority assignment examples. Replace the sample IDs with real users from users.user_id.
-- A user can hold multiple assignments, but each department/stage has one active authority.
--
-- INSERT INTO document_authorities (user_id, service_department, authority_type) VALUES
-- (12, 'ACADEMICS', 'DVO'),
-- (13, 'ACADEMICS', 'HOD'),
-- (14, 'ACADEMICS', 'REGISTRAR'),
-- (12, 'EXAMINATIONS', 'DVO'),
-- (15, 'EXAMINATIONS', 'HOD'),
-- (14, 'EXAMINATIONS', 'REGISTRAR'),
-- (16, 'HOSTEL', 'CHIEF_HOSTEL_WARDEN'),
-- (17, 'HOSTEL', 'HOD'),
-- (14, 'HOSTEL', 'REGISTRAR');
