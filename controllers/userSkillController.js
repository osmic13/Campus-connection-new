const userSkillService = require("../services/userSkillService");

const addUserSkill = async (req, res) => {
    try {
        const { skillId } = req.body;

        await userSkillService.addUserSkill(
            req.user.userId,
            skillId
        );

        res.status(201).json({
            message: "Skill added successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(400).json({
            message: error.message
        });
    }
};

const getUserSkills = async (req, res) => {
    try {
        const skills =
            await userSkillService.getUserSkills(
                req.user.userId
            );

        res.status(200).json({
            skills
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Unable to fetch user skills"
        });
    }
};

module.exports = {
    addUserSkill,
    getUserSkills
};