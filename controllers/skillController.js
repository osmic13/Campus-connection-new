const skillService = require("../services/skillService");

const getAllSkills = async (req, res) => {
    try {
        const skills = await skillService.getAllSkills();

        res.status(200).json({
            skills
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Unable to fetch skills"
        });
    }
};

module.exports = {
    getAllSkills
};