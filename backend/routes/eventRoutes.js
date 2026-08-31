const express = require("express");
const router = express.Router();

const Event = require("../models/Event");
const User = require("../models/User");
const Registration = require("../models/Registration");
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
router.post("/", async (req, res) => {

    try {

        const {
            title,
            category,
            description,
            venue,
            date,
            capacity,
            userId
        } = req.body;


        // Check host
        const host = await User.findById(userId);

        if (!host) {
            return res.status(404).json({
                message: "User not found"
            });
        }


        if (host.role !== "host") {
            return res.status(403).json({
                message: "Only hosts can create events"
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
router.delete("/:id", async (req, res) => {

    try {

        const { userId } = req.body;

        const event =
            await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        const user =
            await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Only host can delete
        if (user.role !== "host") {
            return res.status(403).json({
                message: "Only hosts can delete events"
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