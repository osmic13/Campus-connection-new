const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendOTPEmail = async (email, otp) => {
    await transporter.sendMail({
        from: `"CampusConnect" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "CampusConnect Password Reset OTP",
        text: `Your CampusConnect password reset OTP is ${otp}. It is valid for 5 minutes.`
    });
};

module.exports = {
    sendOTPEmail
};