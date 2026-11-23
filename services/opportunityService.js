const opportunityModel = require("../models/opportunityModel");

const createOpportunity = async (data, userId) => {
    if (!data.title) {
        throw new Error("Opportunity title is required");
    }

    if (!data.description) {
        throw new Error("Opportunity description is required");
    }

    if (!data.organization) {
        throw new Error("Organization is required");
    }

    if (!data.opportunityType) {
        throw new Error("Opportunity type is required");
    }

    const opportunityId = await opportunityModel.createOpportunity({
        ...data,
        createdBy: userId
    });

    return opportunityId;
};

const getAllOpportunities = async () => {
    return await opportunityModel.getAllOpportunities();
};

const getOpportunityById = async (opportunityId) => {
    return await opportunityModel.getOpportunityById(opportunityId);
};

const addOpportunitySkill = async (opportunityId, skillId) => {
    if (!opportunityId) {
        throw new Error("Opportunity ID is required");
    }

    if (!skillId) {
        throw new Error("Skill ID is required");
    }

    return await opportunityModel.addOpportunitySkill(
        opportunityId,
        skillId
    );
};

const getOpportunitySkills = async (opportunityId) => {
    return await opportunityModel.getOpportunitySkills(
        opportunityId
    );
};

const getRecommendedOpportunities = async (userId) => {
    const opportunities =
        await opportunityModel.getRecommendedOpportunities(userId);

    const skillRows =
        await opportunityModel.getOpportunitySkillsForMatching(userId);

    const skillsByOpportunity = {};

    for (const row of skillRows) {
        if (!skillsByOpportunity[row.opportunity_id]) {
            skillsByOpportunity[row.opportunity_id] = {
                matchedSkills: [],
                missingSkills: []
            };
        }

        if (row.is_matched) {
            skillsByOpportunity[row.opportunity_id]
                .matchedSkills
                .push(row.skill_name);
        } else {
            skillsByOpportunity[row.opportunity_id]
                .missingSkills
                .push(row.skill_name);
        }
    }

    return opportunities.map((opportunity) => {
        const skills =
            skillsByOpportunity[opportunity.opportunity_id] || {
                matchedSkills: [],
                missingSkills: []
            };

        return {
            ...opportunity,
            totalSkills: Number(opportunity.total_skills),
            matchedSkills: Number(opportunity.matched_skills),
            matchScore: Math.round(
                (Number(opportunity.matched_skills) /
                    Number(opportunity.total_skills)) * 100
            ),
            matchedSkillNames: skills.matchedSkills,
            missingSkillNames: skills.missingSkills
        };
    });
};

module.exports = {
    createOpportunity,
    getAllOpportunities,
    getOpportunityById,
    addOpportunitySkill,
    getOpportunitySkills,
    getRecommendedOpportunities
};