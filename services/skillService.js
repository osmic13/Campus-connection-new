const skillModel = require("../models/skillModel");

const getAllSkills = async () => {
    return await skillModel.getAllSkills();
};

module.exports = {
    getAllSkills
};