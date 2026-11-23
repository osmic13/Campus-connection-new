const profileModel = require("../models/profileModel");

const getProfile = async (req, res) => {
    try {
        const profile = await profileModel.getProfileByUserId(
            req.user.userId
        );

        if (!profile) {
            return res.status(404).json({
                message: "Profile not found"
            });
        }

        res.status(200).json({
            profile
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Unable to fetch profile"
        });
    }
};

module.exports = {
    getProfile
};