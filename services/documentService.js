const fs = require("fs");
const documentModel = require("../models/documentModel");

const DEPARTMENTS = ["ACADEMICS", "EXAMINATIONS", "HOSTEL"];

const validatePdfFile = async (file) => {
    if (!file) {
        throw new Error("PDF document is required");
    }

    const handle = await fs.promises.open(file.path, "r");
    try {
        const header = Buffer.alloc(5);
        const { bytesRead } = await handle.read(header, 0, 5, 0);
        if (bytesRead !== 5 || header.toString("ascii") !== "%PDF-") {
            throw new Error("Uploaded file is not a valid PDF document");
        }
    } finally {
        await handle.close();
    }
};

const createRequest = async ({ studentId, department, purpose, file }) => {
    if (!DEPARTMENTS.includes(department)) {
        throw new Error("Department must be ACADEMICS, EXAMINATIONS, or HOSTEL");
    }
    if (typeof purpose !== "string" || !purpose.trim()) {
        throw new Error("Purpose is required");
    }
    if (purpose.trim().length > 500) {
        throw new Error("Purpose cannot exceed 500 characters");
    }

    await validatePdfFile(file);
    const stages = documentModel.getStagesForDepartment(department);
    return documentModel.createRequest({
        studentId,
        department,
        purpose: purpose.trim(),
        file,
        stages
    });
};

const resubmitRequest = async ({ requestId, studentId, file }) => {
    await validatePdfFile(file);
    return documentModel.resubmitRequest({ requestId, studentId, file });
};

const getMyRequests = (studentId) => documentModel.getMyRequests(studentId);
const getPendingRequests = (approverId) => documentModel.getPendingRequests(approverId);
const getRequestDetailsForUser = (requestId, userId) =>
    documentModel.getRequestDetailsForUser(requestId, userId);
const getLatestFileForUser = (requestId, userId) =>
    documentModel.getLatestFileForUser(requestId, userId);

const decideRequest = async ({ requestId, approverId, decision, remarks }) => {
    const allowedDecisions = ["APPROVED", "REJECTED", "CORRECTION_REQUESTED"];
    if (!allowedDecisions.includes(decision)) {
        throw new Error("Decision must be APPROVED, REJECTED, or CORRECTION_REQUESTED");
    }
    if (decision !== "APPROVED" && (!remarks || !remarks.trim())) {
        throw new Error("Remarks are required when rejecting or requesting corrections");
    }
    if (remarks && remarks.trim().length > 1000) {
        throw new Error("Remarks cannot exceed 1000 characters");
    }

    return documentModel.decideRequest({
        requestId,
        approverId,
        decision,
        remarks: remarks ? remarks.trim() : null
    });
};

module.exports = {
    createRequest,
    resubmitRequest,
    getMyRequests,
    getPendingRequests,
    getRequestDetailsForUser,
    getLatestFileForUser,
    decideRequest
};
