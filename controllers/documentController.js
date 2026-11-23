const fs = require("fs");
const path = require("path");
const documentService = require("../services/documentService");

const removeUploadedFile = (file) => {
    if (file?.path) {
        fs.promises.unlink(file.path).catch(() => {});
    }
};

const emitToUser = (req, userId, eventName, payload) => {
    const io = req.app.get("io");
    if (io && userId) {
        io.to(`user:${userId}`).emit(eventName, payload);
    }
};

const createRequest = async (req, res) => {
    try {
        if (req.user.role !== "STUDENT") {
            removeUploadedFile(req.file);
            return res.status(403).json({ message: "Only students can submit document requests" });
        }
        const result = await documentService.createRequest({
            studentId: Number(req.user.userId),
            department: req.body.department,
            purpose: req.body.purpose,
            file: req.file
        });

        emitToUser(req, result.firstApproverId, "document_assigned", {
            requestId: result.requestId,
            department: req.body.department,
            stage: result.currentStage
        });

        return res.status(201).json({
            message: "Document submitted successfully",
            requestId: result.requestId,
            status: "PENDING_APPROVAL",
            currentStage: result.currentStage
        });
    } catch (error) {
        removeUploadedFile(req.file);
        console.error("CREATE DOCUMENT REQUEST ERROR:", error);
        const statusCode = error.code === "AUTHORITY_NOT_CONFIGURED" ? 409 : 400;
        return res.status(statusCode).json({ message: error.message || "Unable to submit document" });
    }
};

const getMyRequests = async (req, res) => {
    try {
        const requests = await documentService.getMyRequests(Number(req.user.userId));
        return res.status(200).json({ requests });
    } catch (error) {
        console.error("GET MY DOCUMENT REQUESTS ERROR:", error);
        return res.status(500).json({ message: "Unable to fetch document requests" });
    }
};

const getPendingRequests = async (req, res) => {
    try {
        const requests = await documentService.getPendingRequests(Number(req.user.userId));
        return res.status(200).json({ requests });
    } catch (error) {
        console.error("GET PENDING DOCUMENT REQUESTS ERROR:", error);
        return res.status(500).json({ message: "Unable to fetch pending document requests" });
    }
};

const getRequestDetails = async (req, res) => {
    try {
        const requestId = Number(req.params.id);
        if (!Number.isSafeInteger(requestId) || requestId <= 0) {
            return res.status(400).json({ message: "Invalid document request ID" });
        }

        const request = await documentService.getRequestDetailsForUser(
            requestId,
            Number(req.user.userId)
        );
        if (!request) {
            return res.status(404).json({ message: "Document request not found" });
        }
        return res.status(200).json({ request });
    } catch (error) {
        console.error("GET DOCUMENT REQUEST DETAILS ERROR:", error);
        return res.status(500).json({ message: "Unable to fetch document request" });
    }
};

const downloadLatestFile = async (req, res) => {
    try {
        const requestId = Number(req.params.id);
        if (!Number.isSafeInteger(requestId) || requestId <= 0) {
            return res.status(400).json({ message: "Invalid document request ID" });
        }
        const file = await documentService.getLatestFileForUser(
            requestId,
            Number(req.user.userId)
        );
        if (!file) {
            return res.status(404).json({ message: "Document file not found" });
        }
        if (!fs.existsSync(file.file_path)) {
            return res.status(404).json({ message: "Stored document file is missing" });
        }
        return res.download(file.file_path, path.basename(file.original_file_name));
    } catch (error) {
        console.error("DOWNLOAD DOCUMENT ERROR:", error);
        return res.status(500).json({ message: "Unable to download document" });
    }
};

const decideRequest = async (req, res) => {
    try {
        const requestId = Number(req.params.id);
        if (!Number.isSafeInteger(requestId) || requestId <= 0) {
            return res.status(400).json({ message: "Invalid document request ID" });
        }

        const { decision, remarks } = req.body;
        const result = await documentService.decideRequest({
            requestId,
            approverId: Number(req.user.userId),
            decision,
            remarks
        });

        emitToUser(req, result.studentId, "document_status_updated", {
            requestId,
            status: result.status,
            currentStage: result.nextStage
        });
        if (result.nextApproverId) {
            emitToUser(req, result.nextApproverId, "document_assigned", {
                requestId,
                stage: result.nextStage
            });
        }

        return res.status(200).json({
            message: "Document decision recorded successfully",
            status: result.status,
            nextStage: result.nextStage
        });
    } catch (error) {
        console.error("DOCUMENT DECISION ERROR:", error);
        const statusByCode = {
            NOT_FOUND: 404,
            FORBIDDEN: 403,
            CONFLICT: 409
        };
        const statusCode = statusByCode[error.code] || 400;
        return res.status(statusCode).json({ message: error.message || "Unable to record decision" });
    }
};

const resubmitRequest = async (req, res) => {
    try {
        if (req.user.role !== "STUDENT") {
            removeUploadedFile(req.file);
            return res.status(403).json({ message: "Only students can resubmit documents" });
        }
        const requestId = Number(req.params.id);
        if (!Number.isSafeInteger(requestId) || requestId <= 0) {
            removeUploadedFile(req.file);
            return res.status(400).json({ message: "Invalid document request ID" });
        }

        const result = await documentService.resubmitRequest({
            requestId,
            studentId: Number(req.user.userId),
            file: req.file
        });

        emitToUser(req, result.firstApproverId, "document_assigned", {
            requestId,
            stage: result.currentStage
        });
        emitToUser(req, Number(req.user.userId), "document_status_updated", {
            requestId,
            status: "PENDING_APPROVAL",
            currentStage: result.currentStage
        });
        return res.status(200).json({
            message: "Corrected document resubmitted successfully",
            status: "PENDING_APPROVAL",
            currentStage: result.currentStage,
            cycle: result.cycle
        });
    } catch (error) {
        removeUploadedFile(req.file);
        console.error("RESUBMIT DOCUMENT ERROR:", error);
        const statusByCode = {
            NOT_FOUND: 404,
            CONFLICT: 409,
            AUTHORITY_NOT_CONFIGURED: 409
        };
        const statusCode = statusByCode[error.code] || 400;
        return res.status(statusCode).json({ message: error.message || "Unable to resubmit document" });
    }
};

module.exports = {
    createRequest,
    getMyRequests,
    getPendingRequests,
    getRequestDetails,
    downloadLatestFile,
    decideRequest,
    resubmitRequest
};
