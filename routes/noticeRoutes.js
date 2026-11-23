const express = require("express");

const noticeController =
    require("../controllers/noticeController");

const router = express.Router();

router.get(
    "/published",
    noticeController.getPublishedNotices
);

module.exports = router;