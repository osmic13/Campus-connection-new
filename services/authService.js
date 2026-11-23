const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const otpModel = require("../models/otpModel");
const userModel = require("../models/userModel");
const crypto = require("crypto");
const resetTokenModel = require("../models/resetTokenModel");
const emailService = require("./emailService");

const login = async (collegeId, password) => {
    const user = await userModel.findUserByCollegeId(collegeId);

    if (!user) {
        throw new Error("INVALID_CREDENTIALS");
    }

    if (!user.is_active) {
        throw new Error("ACCOUNT_INACTIVE");
    }

    const passwordMatch = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!passwordMatch) {
        throw new Error("INVALID_CREDENTIALS");
    }

    const token = jwt.sign(
        {
            userId: user.user_id,
            collegeId: user.college_id,
            roleId: user.role_id,
            role: user.role_name
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d"
        }
    );

    return {
        token,
        user: {
            userId: user.user_id,
            collegeId: user.college_id,
            email: user.email,
            role: user.role_name,
            firstLogin: user.first_login
        }
    };
};

const changePassword = async (userId, newPassword) => {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const result = await userModel.updatePassword(
        userId,
        passwordHash
    );

    if (result === 0) {
        throw new Error("USER_NOT_FOUND");
    }

    return true;
};

const generateOTP = () => {
    return crypto.randomInt(10000, 100000).toString();
};

const forgotPassword = async (collegeId) => {
    const user = await userModel.findUserByCollegeId(collegeId);

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    const otp = generateOTP();

    const expiresAt = new Date(
        Date.now() + 5 * 60 * 1000
    );

    await otpModel.createOTP(
        user.user_id,
        otp,
        expiresAt
    );

    await emailService.sendOTPEmail(
        user.email,
        otp
    );

    return {
        message: "OTP sent successfully"
    };
};

const verifyOTP = async (collegeId, otp) => {
    const user = await userModel.findUserByCollegeId(collegeId);

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    const record = await otpModel.findValidOTP(
        user.user_id,
        otp
    );

    if (!record) {
        throw new Error("INVALID_OTP");
    }

    await otpModel.markOTPUsed(record.otp_id);

    const resetToken = crypto.randomBytes(32).toString("hex");

    const expiresAt = new Date(
        Date.now() + 10 * 60 * 1000
    );

    await resetTokenModel.createResetToken(
        user.user_id,
        resetToken,
        expiresAt
    );

    return {
        message: "OTP verified successfully",
        resetToken
    };
};

const resetPassword = async (resetToken, newPassword) => {
    const record = await resetTokenModel.findValidResetToken(
        resetToken
    );

    if (!record) {
        throw new Error("INVALID_RESET_TOKEN");
    }

    const passwordHash = await bcrypt.hash(
        newPassword,
        10
    );

    const updated = await userModel.updatePassword(
        record.user_id,
        passwordHash
    );

    if (updated === 0) {
        throw new Error("USER_NOT_FOUND");
    }

    await resetTokenModel.markTokenUsed(
        record.token_id
    );

    return true;
};

module.exports = {
    login,
    changePassword,
    forgotPassword,
    verifyOTP,
    resetPassword
};