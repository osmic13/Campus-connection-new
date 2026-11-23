const userSkillModel = require("../models/userSkillModel");

const addUserSkill = async (userId, skillId) => {
    if (!skillId) {
        throw new Error("Skill ID is required");
    }

    return await userSkillModel.addUserSkill(
        userId,
        skillId,
        "MANUAL"
    );
};

const getUserSkills = async (userId) => {
    return await userSkillModel.getUserSkills(userId);
};

module.exports = {
    addUserSkill,
    getUserSkills
};