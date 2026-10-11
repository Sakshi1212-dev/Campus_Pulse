const express = require("express");
const router = express.Router();

const mongoose = require("mongoose");

const Notification = require("../models/Notification");
const { verifyToken } = require("../middleware/auth");
const Registration = require("../models/Registration");
const Event = require("../models/Event");

// =====================================
// GET ALL NOTIFICATIONS FOR A USER
// GET /api/notifications/:userId
// =====================================
//
// Before returning the list, this also checks whether any
// of the user's registered events are happening soon and
// creates a one-time "reminder" notification for each —
// no separate cron job needed, since this runs every time
// the frontend polls (every ~20s while the app is open).

router.get("/:userId", verifyToken, async (req, res) => {

    try {

        // You can only ever read your own notifications.
        if (req.params.userId !== req.user.userId) {
            return res.status(403).json({
                message: "You can only view your own notifications"
            });
        }

        await generateDeadlineReminders(req.params.userId);
        await generateEventStartedNotifications(req.params.userId);

        const notifications = await Notification.find({
            userId: req.params.userId
        }).sort({ createdAt: -1 });

        res.status(200).json(notifications);

    } catch (error) {

        console.error("GET NOTIFICATIONS ERROR:", error);

        res.status(500).json({
            message: "Something went wrong"
        });

    }

});


// =====================================
// HELPER: create a reminder notification for
// any registered event starting within 24 hours,
// but only once per event (checks for an existing
// reminder before creating a new one).
// =====================================
async function generateDeadlineReminders(userId) {

    const now = new Date();

    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingRegistrations = await Registration.find({
        userId
    }).populate("eventId");

    for (const reg of upcomingRegistrations) {

        const event = reg.eventId;

        if (!event) continue;

        const eventDate = new Date(event.date);

        const isWithinReminderWindow =
            eventDate > now && eventDate <= in24Hours;

        if (!isWithinReminderWindow) continue;

        // Don't create a duplicate reminder for the same event
        const alreadyReminded = await Notification.findOne({
            userId,
            type: "event_reminder",
            relatedId: event._id
        });

        if (alreadyReminded) continue;

        await Notification.create({
            userId,
            message: `⏰ "${event.title}" is coming up soon — ${eventDate.toLocaleString()}`,
            type: "event_reminder",
            relatedId: event._id
        });

    }

}


// =====================================
// HELPER: create a "this event has started"
// notification once an event's date/time has
// passed. Only fires for events that started
// recently (within the last 6 hours) so old
// past events don't suddenly flood notifications
// the first time this runs after being added.
// =====================================
async function generateEventStartedNotifications(userId) {

    const now = new Date();

    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

    const registrations = await Registration.find({
        userId
    }).populate("eventId");

    for (const reg of registrations) {

        const event = reg.eventId;

        if (!event) continue;

        const eventDate = new Date(event.date);

        const hasJustStarted =
            eventDate <= now && eventDate >= sixHoursAgo;

        if (!hasJustStarted) continue;

        const alreadyNotified = await Notification.findOne({
            userId,
            type: "event_started",
            relatedId: event._id
        });

        if (alreadyNotified) continue;

        await Notification.create({
            userId,
            message: `🎉 "${event.title}" has started! Head over if you haven't already.`,
            type: "event_started",
            relatedId: event._id
        });

    }

}


// =====================================
// MARK ONE NOTIFICATION AS READ
// PUT /api/notifications/:id/read
// =====================================
router.put("/:id/read", verifyToken, async (req, res) => {

    try {

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid notification ID" });
        }

        // Matching on userId as well means a notification that
        // belongs to someone else is simply "not found" for you.
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.userId },
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
            message: "Something went wrong"
        });

    }

});


// =====================================
// MARK ALL AS READ FOR A USER
// PUT /api/notifications/read-all/:userId
// =====================================
router.put("/read-all/:userId", verifyToken, async (req, res) => {

    try {

        if (req.params.userId !== req.user.userId) {
            return res.status(403).json({
                message: "You can only update your own notifications"
            });
        }

        await Notification.updateMany(
            { userId: req.user.userId, isRead: false },
            { isRead: true }
        );

        res.status(200).json({ message: "All notifications marked as read" });

    } catch (error) {

        console.error("MARK ALL READ ERROR:", error);

        res.status(500).json({
            message: "Something went wrong"
        });

    }

});


module.exports = router;