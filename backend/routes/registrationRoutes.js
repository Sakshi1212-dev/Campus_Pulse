const express = require("express");
const router = express.Router();

const Registration = require("../models/Registration");

// =====================================
// REGISTER FOR EVENT
// =====================================

router.post("/", async (req, res) => {

    try {

        const { userId, eventId } = req.body;

        // Check if already registered

        const existingRegistration =
            await Registration.findOne({
                userId,
                eventId
            });

        if (existingRegistration) {

            return res.status(400).json({
                message: "Already registered for this event"
            });

        }

        // Create registration

        const registration =
            new Registration({
                userId,
                eventId
            });

        const savedRegistration =
            await registration.save();

        res.status(201).json({
            message: "Successfully registered",
            registration: savedRegistration
        });

    } catch (error) {

        res.status(500).json({
            message: "Registration failed",
            error: error.message
        });

    }

});


// =====================================
// GET USER REGISTRATIONS
// =====================================

router.get("/user/:userId", async (req, res) => {

    try {

        const registrations =
            await Registration.find({
                userId: req.params.userId
            }).populate("eventId");

        res.status(200).json(registrations);

    } catch (error) {

        res.status(500).json({
            message: "Failed to fetch registrations",
            error: error.message
        });

    }

});


// =====================================
// CANCEL REGISTRATION
// =====================================

router.delete("/:id", async (req, res) => {

    try {

        await Registration.findByIdAndDelete(
            req.params.id
        );

        res.status(200).json({
            message: "Registration cancelled"
        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to cancel registration",
            error: error.message
        });

    }

});


module.exports = router;