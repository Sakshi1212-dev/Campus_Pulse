const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Event = require("../models/Event");
const Registration = require("../models/Registration");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { verifyToken, requireRole } = require("../middleware/auth");

// =====================================
// HOST SENDS A MESSAGE TO EVERYONE
// REGISTERED FOR THEIR EVENT
// POST /api/events/:id/message
// body: { message }
// =====================================
//
// Three checks, in this order:
//   1. verifyToken          -> you are logged in (identity from the JWT)
//   2. requireRole("host")  -> you are a host, so students stop here
//   3. event.createdBy      -> you are the host of THIS event
// Previously the host's id was read from the request body, so anyone
// who knew a host's id could message their attendees as that host.
router.post("/:id/message", verifyToken, requireRole("host"), async (req, res) => {

    try {

        const userId = req.user.userId;

        const message =
            typeof req.body.message === "string"
                ? req.body.message.trim().slice(0, 500)
                : "";

        if (!message) {
            return res.status(400).json({
                message: "A non-empty message is required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid event ID" });
        }

        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Only the host who created this event can message its attendees
        if (event.createdBy.toString() !== userId) {
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
            message: `${host ? host.name : "The host"} (${event.title}): ${message}`,
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
            message: "Something went wrong"
        });

    }

});


module.exports = router;