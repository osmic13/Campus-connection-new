const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDirectory = path.join(
    __dirname,
    "../uploads/resumes"
);

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, {
        recursive: true
    });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },

    filename: (req, file, cb) => {
        const extension =
            path.extname(file.originalname);

        const fileName =
            `${req.user.userId}_${Date.now()}${extension}`;

        cb(null, fileName);
    }
});

const fileFilter = (req, file, cb) => {
    const extension =
        path.extname(file.originalname).toLowerCase();

    if (extension === ".pdf") {
        cb(null, true);
    } else {
        cb(
            new Error("Only PDF resumes are allowed"),
            false
        );
    }
};

const uploadResume = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

module.exports = uploadResume;