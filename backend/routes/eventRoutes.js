const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

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

        // Cancelled events (deleted by a host after students had
        // already registered) and completed events (their date
        // has passed) are both hidden from the normal public
        // list — they still exist in the database so
        // registration/attendance history stays intact.
        const events = await Event.find({
            status: { $in: ["active", "full"] }
        }).sort({ createdAt: -1 }).lean();

        // One grouped query for every event's registration count,
        // instead of a separate database call per event.
        const counts = await Registration.aggregate([
            {
                $match: {
                    eventId: { $in: events.map(event => event._id) }
                }
            },
            {
                $group: {
                    _id: "$eventId",
                    count: { $sum: 1 }
                }
            }
        ]);

        const countByEventId = {};

        counts.forEach(entry => {
            countByEventId[entry._id.toString()] = entry.count;
        });

        const eventsWithCounts = events.map(event => ({
            ...event,
            registeredCount: countByEventId[event._id.toString()] || 0
        }));

        res.status(200).json(eventsWithCounts);

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

        // Reject a malformed ID before it ever reaches the
        // database, with a clean 400 instead of a raw 500.
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

            return res.status(400).json({
                message: "Invalid event ID"
            });

        }

        // The requester is whoever the verified token says —
        // never whatever the request body claims.
        const userId = req.user.userId;

        const event =
            await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        // Only the host who created THIS event can delete it —
        // requireRole("host") above already blocks students;
        // this additionally blocks any other host.
        if (
            event.createdBy.toString() !==
            userId.toString()
        ) {
            return res.status(403).json({
                message: "You can only delete your own events"
            });
        }

        const registrationCount = await Registration.countDocuments({
            eventId: req.params.id
        });

        if (registrationCount === 0) {

            // No one registered yet — safe to remove entirely.
            await Event.findByIdAndDelete(req.params.id);

            return res.status(200).json({
                message: "Event deleted successfully"
            });

        }

        // Students have already registered — cancel instead of
        // hard-deleting, so their registration/attendance/
        // certificate history isn't destroyed along with it.
        // updateOne (not event.save()) only touches this one
        // field, so it can't be blocked by an unrelated
        // validation issue elsewhere on the document.
        await Event.updateOne(
            { _id: req.params.id },
            { $set: { status: "cancelled" } }
        );

        res.status(200).json({
            message: `Event cancelled (${registrationCount} existing registration${registrationCount === 1 ? "" : "s"} preserved)`
        });

    } catch (error) {

        console.log("DELETE EVENT ERROR:", error);

        res.status(500).json({
            message: "Something went wrong",
            error: error.message
        });

    }

});
module.exports = router;