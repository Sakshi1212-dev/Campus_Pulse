const express = require("express");
const router = express.Router();

const Event = require("../models/Event");
const User = require("../models/User");
const Registration = require("../models/Registration");
const { verifyToken, requireRole } = require("../middleware/auth");
const { eventValidation, handleValidation } = require("../middleware/validate");
// =====================================
// GET ALL EVENTS
// =====================================

router.get("/", async (req, res) => {

    try {

        const events = await Event.find().sort({ createdAt: -1 });

        res.status(200).json(events);

    } catch (error) {

        res.status(500).json({
            message: "Failed to fetch events",
            error: error.message
        });

    }

});


// =====================================
// GET SINGLE EVENT
// =====================================

router.get("/:id", async (req, res) => {

    try {

        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        res.status(200).json(event);

    } catch (error) {

        res.status(500).json({
            message: "Failed to fetch event",
            error: error.message
        });

    }

});


// =====================================
// CREATE EVENT
// =====================================
router.post(
    "/",
    verifyToken,
    requireRole("host"),
    eventValidation,
    handleValidation,
    async (req, res) => {

    try {

        const {
            title,
            category,
            description,
            venue,
            date,
            capacity
        } = req.body;

        // The host is whoever the verified token says it is —
        // not whatever userId the request body claims.
        const userId = req.user.userId;

        const host = await User.findById(userId);

        if (!host) {
            return res.status(404).json({
                message: "User not found"
            });
        }


        // Create event
        const newEvent = new Event({

            title,
            category,
            description,
            venue,
            date,
            capacity,

            createdBy: userId

        });


        const savedEvent = await newEvent.save();


        // 🔔 Broadcast to every connected student in real time,
        // via the Socket.IO instance set up in server.js
        const io = req.app.get("io");

        console.log("Attempting to broadcast newEvent. io exists?", !!io);

        if (io) {

            io.emit("newEvent", {
                eventId: savedEvent._id,
                title: savedEvent.title,
                category: savedEvent.category,
                hostName: host.name
            });

            console.log("Broadcast sent for event:", savedEvent.title);

        }


        res.status(201).json(savedEvent);


    } catch (error) {

        console.log("CREATE EVENT ERROR:", error);

        res.status(400).json({
            message: "Failed to create event",
            error: error.message
        });

    }

});


// =====================================
// DELETE EVENT
// =====================================
router.delete("/:id", verifyToken, requireRole("host"), async (req, res) => {

    try {

        // The requester is whoever the verified token says —
        // not whatever userId the request body claims.
        const userId = req.user.userId;

        const event =
            await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        // Only event owner can delete
        if (
            event.createdBy.toString() !==
            userId.toString()
        ) {
            return res.status(403).json({
                message: "You can delete only your own events"
            });
        }

        await Event.findByIdAndDelete(req.params.id);

        await Registration.deleteMany({
            eventId: req.params.id
        });

        res.status(200).json({
            message: "Event deleted successfully"
        });

    } catch (error) {

        console.log("DELETE EVENT ERROR:", error);

        res.status(500).json({
            message: "Failed to delete event",
            error: error.message
        });

    }

});
module.exports = router;