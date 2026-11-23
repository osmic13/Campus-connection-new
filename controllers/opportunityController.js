const opportunityService = require("../services/opportunityService");

const createOpportunity = async (req, res) => {
    try {
        const opportunityId =
            await opportunityService.createOpportunity(
                req.body,
                req.user.userId
            );

        res.status(201).json({
            message: "Opportunity created successfully",
            opportunityId
        });

    } catch (error) {
        console.error(error);

        res.status(400).json({
            message: error.message
        });
    }
};

const getAllOpportunities = async (req, res) => {
    try {
        const opportunities =
            await opportunityService.getAllOpportunities();

        res.status(200).json({
            opportunities
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Unable to fetch opportunities"
        });
    }
};

const getOpportunityById = async (req, res) => {
    try {
        const opportunity =
            await opportunityService.getOpportunityById(
                req.params.id
            );

        if (!opportunity) {
            return res.status(404).json({
                message: "Opportunity not found"
            });
        }

        res.status(200).json({
            opportunity
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Unable to fetch opportunity"
        });
    }
};

const addOpportunitySkill = async (req, res) => {
    try {
        const opportunityId = req.params.id;
        const { skillId } = req.body;

        await opportunityService.addOpportunitySkill(
            opportunityId,
            skillId
        );

        res.status(201).json({
            message: "Skill added to opportunity successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(400).json({
            message: error.message
        });
    }
};

const getOpportunitySkills = async (req, res) => {
    try {
        const opportunityId = req.params.id;

        const skills =
            await opportunityService.getOpportunitySkills(
                opportunityId
            );

        res.status(200).json({
            skills
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Unable to fetch opportunity skills"
        });
    }
};

const getRecommendedOpportunities = async (req, res) => {
    try {
        const opportunities =
            await opportunityService.getRecommendedOpportunities(
                req.user.userId
            );

        res.status(200).json({
            opportunities
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Unable to fetch recommended opportunities"
        });
    }
};

module.exports = {
    createOpportunity,
    getAllOpportunities,
    getOpportunityById,
    addOpportunitySkill,
    getOpportunitySkills,
    getRecommendedOpportunities
};