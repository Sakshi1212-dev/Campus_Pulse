const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Registration = require("../models/Registration");
const Event = require("../models/Event");
const Notification = require("../models/Notification");
const { verifyToken, requireRole } = require("../middleware/auth");

// Trim a text field from the form and cap its length, so a
// registration can't be used to stuff huge strings in the database.
function cleanText(value, maxLength = 100) {

    if (typeof value !== "string") return "";

    return value.trim().slice(0, maxLength);

}

// =====================================
// REGISTER FOR EVENT (students only)
// POST /api/registrations
// =====================================
//
// WHO is registering always comes from the verified JWT
// (req.user.userId) — never from the request body, so nobody
// can register (or be registered) as someone else.

router.post("/", verifyToken, requireRole("student"), async (req, res) => {

    try {

        const userId = req.user.userId;

        const { eventId, name, branch, year, email } = req.body;

        if (!mongoose.Types.ObjectId.isValid(eventId)) {

            return res.status(400).json({
                message: "Invalid event ID"
            });

        }

        const event = await Event.findById(eventId);

        if (!event) {

            return res.status(404).json({
                message: "Event not found"
            });

        }

        // Registration is only open for upcoming events that
        // haven't been cancelled or finished.
        if (
            event.status === "completed" ||
            event.status === "cancelled" ||
            new Date(event.date) < new Date()
        ) {

            return res.status(400).json({
                message: "Registration is closed for this event"
            });

        }

        // Check if already registered
        const existingRegistration =
            await Registration.findOne({ userId, eventId });

        if (existingRegistration) {

            return res.status(400).json({
                message: "Already registered for this event"
            });

        }

        // Capacity check (first line of defence)
        const currentRegistrationCount =
            await Registration.countDocuments({ eventId });

        if (currentRegistrationCount >= event.capacity) {

            await Event.updateOne(
                { _id: eventId },
                { $set: { status: "full" } }
            );

            return res.status(400).json({
                message: "This event is full"
            });

        }

        const savedRegistration = await new Registration({
            userId,
            eventId,
            name: cleanText(name),
            branch: cleanText(branch),
            year: cleanText(year, 20),
            email: cleanText(email, 150)
        }).save();

        // Capacity check (second line of defence, for races).
        //
        // If two students click "Register" for the very last seat
        // at the same instant, both can pass the check above. So
        // after saving, we work out this registration's place in
        // the queue (by creation order). Only the first `capacity`
        // registrations are allowed to stay — anyone beyond that
        // is removed again, so an event can never be overbooked.
        const position = await Registration.countDocuments({
            eventId,
            _id: { $lte: savedRegistration._id }
        });

        if (position > event.capacity) {

            await Registration.deleteOne({ _id: savedRegistration._id });

            await Event.updateOne(
                { _id: eventId },
                { $set: { status: "full" } }
            );

            return res.status(400).json({
                message: "This event is full"
            });

        }

        // This registration took the last open spot
        if (position >= event.capacity) {

            await Event.updateOne(
                { _id: eventId },
                { $set: { status: "full" } }
            );

        }

        // Notify the student their registration went through
        try {

            await Notification.create({
                userId,
                message: `You're registered for "${event.title}" on ${new Date(event.date).toLocaleDateString()}`,
                type: "registration_confirmed",
                relatedId: eventId
            });

        } catch (notifyError) {

            console.error("Failed to create registration notification:", notifyError);

        }

        res.status(201).json({
            message: "Successfully registered",
            registration: savedRegistration
        });

    } catch (error) {

        // Duplicate key from the unique (userId, eventId) index —
        // two clicks by the same student landing together.
        if (error.code === 11000) {

            return res.status(400).json({
                message: "Already registered for this event"
            });

        }

        console.error("REGISTRATION ERROR:", error);

        res.status(500).json({
            message: "Something went wrong"
        });

    }

});


// =====================================
// GET MY REGISTRATIONS
// GET /api/registrations/user/:userId
// =====================================
//
// The :userId stays in the URL so the frontend keeps working,
// but it must match the logged-in user — you can only ever
// read your own registrations.

router.get("/user/:userId", verifyToken, async (req, res) => {

    try {

        if (req.params.userId !== req.user.userId) {

            return res.status(403).json({
                message: "You can only view your own registrations"
            });

        }

        const registrations =
            await Registration.find({
                userId: req.user.userId
            }).populate("eventId");

        res.status(200).json(registrations);

    } catch (error) {

        console.error("GET REGISTRATIONS ERROR:", error);

        res.status(500).json({
            message: "Something went wrong"
        });

    }

});


// =====================================
// CANCEL MY REGISTRATION
// DELETE /api/registrations/:id
// =====================================

router.delete("/:id", verifyToken, async (req, res) => {

    try {

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

            return res.status(400).json({
                message: "Invalid registration ID"
            });

        }

        const registration = await Registration.findById(req.params.id);

        if (!registration) {

            return res.status(404).json({
                message: "Registration not found"
            });

        }

        // Only the student who made this registration can cancel it
        if (registration.userId.toString() !== req.user.userId) {

            return res.status(403).json({
                message: "You can only cancel your own registration"
            });

        }

        await Registration.deleteOne({ _id: registration._id });

        // A spot may have just opened up — if the event was
        // marked "full", reopen it. Events that are
        // "completed"/"cancelled" are left alone.
        const event = await Event.findById(registration.eventId);

        if (event && event.status === "full") {

            const remainingCount = await Registration.countDocuments({
                eventId: registration.eventId
            });

            if (remainingCount < event.capacity) {

                await Event.updateOne(
                    { _id: registration.eventId },
                    { $set: { status: "active" } }
                );

            }

        }

        res.status(200).json({
            message: "Registration cancelled"
        });

    } catch (error) {

        console.error("CANCEL REGISTRATION ERROR:", error);

        res.status(500).json({
            message: "Something went wrong"
        });

    }

});


module.exports = router;