const postModel = require("../models/postModel");

const getAllPosts = async (req, res) => {
    try {
        const posts = await postModel.getAllPosts();

        res.status(200).json({
            posts
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Unable to fetch posts"
        });
    }
};

module.exports = {
    getAllPosts
};