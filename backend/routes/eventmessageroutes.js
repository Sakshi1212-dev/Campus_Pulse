const express = require("express");
const router = express.Router();

const Event = require("../models/Event");
const Registration = require("../models/Registration");
const Notification = require("../models/Notification");
const User = require("../models/User");

// =====================================
// HOST SENDS A MESSAGE TO EVERYONE
// REGISTERED FOR THEIR EVENT
// POST /api/events/:id/message
// body: { userId (host), message }
// =====================================
router.post("/:id/message", async (req, res) => {

    try {

        const { userId, message } = req.body;

        if (!userId || !message || !message.trim()) {
            return res.status(400).json({
                message: "userId and a non-empty message are required"
            });
        }

        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Only the host who created this event can message its attendees
        if (event.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({
                message: "Only the event host can message attendees"
            });
        }

        const host = await User.findById(userId);

        const registrations = await Registration.find({
            eventId: req.params.id
        });

        if (registrations.length === 0) {
            return res.status(200).json({
                message: "No one is registered for this event yet"
            });
        }

        const notifications = registrations.map(reg => ({
            userId: reg.userId,
            message: `${host ? host.name : "The host"} (${event.title}): ${message.trim()}`,
            type: "host_message",
            relatedId: event._id
        }));

        await Notification.insertMany(notifications);

        res.status(200).json({
            message: `Message sent to ${registrations.length} attendee(s)`
        });

    } catch (error) {

        console.error("HOST MESSAGE ERROR:", error);

        res.status(500).json({
            message: "Failed to send message",
            error: error.message
        });

    }

});


module.exports = router;