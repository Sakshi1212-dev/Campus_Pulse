const express = require("express");
const router = express.Router();

const Notification = require("../models/Notification");

// =====================================
// GET ALL NOTIFICATIONS FOR A USER
// GET /api/notifications/:userId
// =====================================
router.get("/:userId", async (req, res) => {

    try {

        const notifications = await Notification.find({
            userId: req.params.userId
        }).sort({ createdAt: -1 });

        res.status(200).json(notifications);

    } catch (error) {

        console.error("GET NOTIFICATIONS ERROR:", error);

        res.status(500).json({
            message: "Failed to fetch notifications",
            error: error.message
        });

    }

});


// =====================================
// GET UNREAD COUNT FOR A USER (for the bell badge)
// GET /api/notifications/:userId/unread-count
// =====================================
router.get("/:userId/unread-count", async (req, res) => {

    try {

        const count = await Notification.countDocuments({
            userId: req.params.userId,
            isRead: false
        });

        res.status(200).json({ count });

    } catch (error) {

        console.error("GET UNREAD COUNT ERROR:", error);

        res.status(500).json({
            message: "Failed to fetch unread count",
            error: error.message
        });

    }

});


// =====================================
// MARK ONE NOTIFICATION AS READ
// PUT /api/notifications/:id/read
// =====================================
router.put("/:id/read", async (req, res) => {

    try {

        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json(notification);

    } catch (error) {

        console.error("MARK NOTIFICATION READ ERROR:", error);

        res.status(500).json({
            message: "Failed to update notification",
            error: error.message
        });

    }

});


// =====================================
// MARK ALL AS READ FOR A USER
// PUT /api/notifications/read-all/:userId
// =====================================
router.put("/read-all/:userId", async (req, res) => {

    try {

        await Notification.updateMany(
            { userId: req.params.userId, isRead: false },
            { isRead: true }
        );

        res.status(200).json({ message: "All notifications marked as read" });

    } catch (error) {

        console.error("MARK ALL READ ERROR:", error);

        res.status(500).json({
            message: "Failed to update notifications",
            error: error.message
        });

    }

});


module.exports = router;