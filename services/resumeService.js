const fs = require("fs");
const { PDFParse } = require("pdf-parse");

const resumeModel = require("../models/resumeModel");

const extractTextFromPDF = async (filePath) => {
    const fileBuffer = fs.readFileSync(filePath);

    const parser = new PDFParse({
        data: fileBuffer
    });

    const result = await parser.getText();

    await parser.destroy();

    return result.text;
};

const detectSkills = async (text) => {
    const pool = require("../database/db");

    const [skills] = await pool.query(
        `SELECT skill_id, skill_name
         FROM skills`
    );

    const detectedSkills = [];

    for (const skill of skills) {
        const skillName = skill.skill_name.toLowerCase();

        const escapedSkill = skillName.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        const pattern = new RegExp(
            `(^|[^a-z0-9+#])${escapedSkill}([^a-z0-9+#]|$)`,
            "i"
        );

        if (pattern.test(text)) {
            detectedSkills.push(skill);
        }
    }

    return detectedSkills;
};

const processResume = async (
    userId,
    fileName,
    filePath
) => {
    const extractedText =
        await extractTextFromPDF(filePath);

    const detectedSkills =
        await detectSkills(extractedText);

    await resumeModel.deleteResumeSkills(userId);

    for (const skill of detectedSkills) {
        await resumeModel.addResumeSkill(
            userId,
            skill.skill_id
        );
    }

    const resumeId =
        await resumeModel.createResume(
            userId,
            fileName,
            filePath,
            extractedText
        );

    return {
        resumeId,
        detectedSkills
    };
};

const getResume = async (userId) => {
    return await resumeModel.getResumeByUserId(userId);
};

module.exports = {
    extractTextFromPDF,
    detectSkills,
    processResume,
    getResume
};