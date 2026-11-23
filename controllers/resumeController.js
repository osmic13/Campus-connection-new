const resumeService = require("../services/resumeService");

const uploadResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "Resume file is required"
            });
        }

        const result =
            await resumeService.processResume(
                req.user.userId,
                req.file.originalname,
                req.file.path
            );

        res.status(201).json({
            message: "Resume uploaded successfully",
            resumeId: result.resumeId,
            detectedSkills: result.detectedSkills
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Unable to process resume"
        });
    }
};

const getResume = async (req, res) => {
    try {
        const resume =
            await resumeService.getResume(
                req.user.userId
            );

        if (!resume) {
            return res.status(404).json({
                message: "No resume found"
            });
        }

        res.status(200).json({
            resume
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Unable to fetch resume"
        });
    }
};

module.exports = {
    uploadResume,
    getResume
};