const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDirectory = path.join(__dirname, "../uploads/documents");

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => callback(null, uploadDirectory),
    filename: (req, file, callback) => {
        callback(null, `${crypto.randomUUID()}.pdf`);
    }
});

const fileFilter = (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (extension !== ".pdf" || file.mimetype !== "application/pdf") {
        return callback(new Error("Only PDF documents are allowed"));
    }
    callback(null, true);
};

module.exports = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});
