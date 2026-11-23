const hodMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Authentication required"
        });
    }

    if (req.user.role !== "HOD") {
        return res.status(403).json({
            message: "HOD access required"
        });
    }

    next();
};

module.exports = hodMiddleware;