const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const { verifyToken, requireRole } = require("../middleware/auth");

// ==========================================
// Every route below now requires a valid JWT AND a role
// of "admin" — decoded from the token itself, not trusted
// from a client-supplied adminId in the query/body. This
// is applied once here to the whole router, so every route
// defined after this line is protected automatically.
// ==========================================

router.use(verifyToken, requireRole("admin"));


// =====================================
// GET ALL USERS (students + hosts + admins)
// GET /api/admin/users
// =====================================
router.get("/users", async (req, res) => {

    try {

        const users = await User.find().select("-password");

        res.status(200).json(users);

    } catch (error) {

        res.status(500).json({
            message: "Failed to fetch users",
            error: error.message
        });

    }

});


// =====================================
// GET ALL EVENTS (regardless of host)
// GET /api/admin/events
// =====================================
router.get("/events", async (req, res) => {

    try {

        const events = await Event.find()
            .populate("createdBy", "name email role")
            .sort({ createdAt: -1 });

        res.status(200).json(events);

    } catch (error) {

        res.status(500).json({
            message: "Failed to fetch events",
            error: error.message
        });

    }

});


// =====================================
// GET ALL REGISTRATIONS (every student, every event)
// GET /api/admin/registrations
// =====================================
router.get("/registrations", async (req, res) => {

    try {

        const registrations = await Registration.find()
            .populate("userId", "name email")
            .populate("eventId", "title date")
            .sort({ createdAt: -1 });

        res.status(200).json(registrations);

    } catch (error) {

        res.status(500).json({
            message: "Failed to fetch registrations",
            error: error.message
        });

    }

});


// =====================================
// DELETE ANY USER
// DELETE /api/admin/users/:id
// =====================================
router.delete("/users/:id", async (req, res) => {

    try {

        await User.findByIdAndDelete(req.params.id);

        // Clean up anything tied to this user so there's
        // no orphaned data left behind
        await Event.deleteMany({ createdBy: req.params.id });
        await Registration.deleteMany({ userId: req.params.id });

        res.status(200).json({ message: "User deleted successfully" });

    } catch (error) {

        res.status(500).json({
            message: "Failed to delete user",
            error: error.message
        });

    }

});


// =====================================
// DELETE ANY EVENT (regardless of host)
// DELETE /api/admin/events/:id
// =====================================
router.delete("/events/:id", async (req, res) => {

    try {

        await Event.findByIdAndDelete(req.params.id);

        await Registration.deleteMany({ eventId: req.params.id });

        res.status(200).json({ message: "Event deleted successfully" });

    } catch (error) {

        res.status(500).json({
            message: "Failed to delete event",
            error: error.message
        });

    }

});


// =====================================
// DELETE ANY REGISTRATION
// DELETE /api/admin/registrations/:id
// =====================================
router.delete("/registrations/:id", async (req, res) => {

    try {

        await Registration.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: "Registration deleted successfully" });

    } catch (error) {

        res.status(500).json({
            message: "Failed to delete registration",
            error: error.message
        });

    }

});


module.exports = router;