const crypto = require("crypto");
const bcrypt = require("bcrypt");
const adminModel = require("../models/adminModel");


const getDashboardStats = async () => {
    return await adminModel.getDashboardStats();
};


const getAllUsers = async (
    search = "",
    role = ""
) => {
    return await adminModel.getAllUsers(
        search,
        role
    );
};


const getAllRoles = async () => {
    return await adminModel.getAllRoles();
};


const createUser = async (data) => {
    const {
        collegeId,
        fullName,
        email,
        department,
        roleName
    } = data;

    const normalizedCollegeId = String(collegeId ?? "").trim();
    const normalizedName = String(fullName ?? "").trim();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const normalizedDepartment = String(department ?? "").trim();
    const normalizedRole = String(roleName ?? "").trim().toUpperCase();

    if (!/^\d{1,19}$/.test(normalizedCollegeId)) {
        throw Object.assign(new Error("College ID must contain 1 to 19 digits"), { statusCode: 400 });
    }

    if (BigInt(normalizedCollegeId) > 9223372036854775807n) {
        throw Object.assign(new Error("College ID exceeds the supported BIGINT range"), { statusCode: 400 });
    }

    if (!normalizedName || normalizedName.length > 100) {
        throw Object.assign(new Error("Full name is required and must not exceed 100 characters"), { statusCode: 400 });
    }

    if (normalizedEmail.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw Object.assign(new Error("A valid email address is required (maximum 100 characters)"), { statusCode: 400 });
    }

    if (!normalizedDepartment || normalizedDepartment.length > 100) {
        throw Object.assign(new Error("Department is required and must not exceed 100 characters"), { statusCode: 400 });
    }

    const roles = await adminModel.getAllRoles();
    const selectedRole = roles.find(
        (role) => role.role_name === normalizedRole
    );

    if (!selectedRole) {
        throw Object.assign(new Error("Invalid role. Select a role available in the system."), { statusCode: 400 });
    }

    let year = 0;
    let section = "N/A";

    if (normalizedRole === "STUDENT") {
        year = Number(data.year);
        section = String(data.section ?? "").trim();

        if (!Number.isInteger(year) || year < 1 || year > 10) {
            throw Object.assign(new Error("Student year must be an integer between 1 and 10"), { statusCode: 400 });
        }

        if (!section || section.length > 10) {
            throw Object.assign(new Error("Student section is required and must not exceed 10 characters"), { statusCode: 400 });
        }
    }

    // Generate a one-time temporary password; only its bcrypt hash is stored.
    const temporaryPassword = crypto.randomBytes(12).toString("base64url");
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const user = await adminModel.createManagedUser({
        collegeId: normalizedCollegeId,
        fullName: normalizedName,
        email: normalizedEmail,
        passwordHash,
        department: normalizedDepartment,
        year,
        section,
        roleId: selectedRole.role_id
    });

    return {
        user,
        temporaryPassword
    };
};


const getAllOpportunities = async () => {
    return await adminModel.getAllOpportunities();
};


const getAllNotices = async () => {
    return await adminModel.getAllNotices();
};


const updateNoticeVerification = async (
    postId,
    isVerified
) => {
    return await adminModel.updateNoticeVerification(
        postId,
        isVerified
    );
};


const getHODs = async () => {
    return await adminModel.getHODs();
};


const createNotice = async (
    title,
    content,
    createdBy,
    hodIds
) => {
    return await adminModel.createNotice(
        title,
        content,
        createdBy,
        hodIds
    );
};


const updateNotice = async (
    noticeId,
    title,
    content
) => {
    return await adminModel.updateNotice(
        noticeId,
        title,
        content
    );
};


const publishNotice = async (
    noticeId
) => {
    return await adminModel.publishNotice(
        noticeId
    );
};


module.exports = {
    getDashboardStats,
    getAllUsers,
    getAllRoles,
    createUser,
    getAllOpportunities,
    getAllNotices,
    updateNoticeVerification,
    getHODs,
    createNotice,
    updateNotice,
    publishNotice
};
