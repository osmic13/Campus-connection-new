const authService = require("../services/authService");

const login = async (req, res) => {
    try {
        const { collegeId, password } = req.body;

        if (!collegeId) {
            return res.status(400).json({
                message: "College ID is required"
            });
        }

        if (!password) {
            return res.status(400).json({
                message: "Password is required"
            });
        }

        const result = await authService.login(
            collegeId,
            password
        );

        res.status(200).json({
            message: "Login successful",
            ...result
        });

    } catch (error) {
        console.error(error);

        if (error.message === "INVALID_CREDENTIALS") {
            return res.status(401).json({
                message: "Invalid college ID or password"
            });
        }

        if (error.message === "ACCOUNT_INACTIVE") {
            return res.status(403).json({
                message: "Account is inactive"
            });
        }

        res.status(500).json({
            message: "Internal server error"
        });
    }
};

const changePassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({
                message: "New password is required"
            });
        }

        if (!confirmPassword) {
            return res.status(400).json({
                message: "Confirm password is required"
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match"
            });
        }

        await authService.changePassword(
            req.user.userId,
            newPassword
        );

        res.status(200).json({
            message: "Password changed successfully"
        });

    } catch (error) {
        console.error(error);

        if (error.message === "USER_NOT_FOUND") {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(500).json({
            message: "Internal server error"
        });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { collegeId } = req.body;

        if (!collegeId) {
            return res.status(400).json({
                message: "College ID is required"
            });
        }

        const result = await authService.forgotPassword(
            collegeId
        );

        res.status(200).json(result);

    } catch (error) {
        console.error(error);

        if (error.message === "USER_NOT_FOUND") {
            return res.status(404).json({
                message: "College ID is not registered"
            });
        }

        res.status(500).json({
            message: "Unable to send OTP"
        });
    }
};

const verifyOTP = async (req, res) => {
    try {
        const { collegeId, otp } = req.body;

        if (!collegeId) {
            return res.status(400).json({
                message: "College ID is required"
            });
        }

        if (!otp) {
            return res.status(400).json({
                message: "OTP is required"
            });
        }

        const result = await authService.verifyOTP(
            collegeId,
            otp
        );

        res.status(200).json(result);

    } catch (error) {
        console.error(error);

        if (error.message === "USER_NOT_FOUND") {
            return res.status(404).json({
                message: "College ID is not registered"
            });
        }

        if (error.message === "INVALID_OTP") {
            return res.status(400).json({
                message: "Invalid or expired OTP"
            });
        }

        res.status(500).json({
            message: "Unable to verify OTP"
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const {
            resetToken,
            newPassword,
            confirmPassword
        } = req.body;

        if (!resetToken) {
            return res.status(400).json({
                message: "Reset token is required"
            });
        }

        if (!newPassword) {
            return res.status(400).json({
                message: "New password is required"
            });
        }

        if (!confirmPassword) {
            return res.status(400).json({
                message: "Confirm password is required"
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match"
            });
        }

        await authService.resetPassword(
            resetToken,
            newPassword
        );

        res.status(200).json({
            message: "Password reset successfully"
        });

    } catch (error) {
        console.error(error);

        if (error.message === "INVALID_RESET_TOKEN") {
            return res.status(400).json({
                message: "Invalid or expired reset token"
            });
        }

        if (error.message === "USER_NOT_FOUND") {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(500).json({
            message: "Internal server error"
        });
    }
};

module.exports = {
    login,
    changePassword,
    forgotPassword,
    verifyOTP,
    resetPassword
};