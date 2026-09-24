const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Event = require("../models/Event");
const Registration = require("../models/Registration");

// ==========================================
// HELPER: verify the requester is an admin
// ==========================================
//
// Since this project doesn't use JWT/sessions, we check
// the admin's identity the same way the rest of the app
// does: by looking up the userId that was sent, and
// confirming their role is "admin" in the database.
// This runs on every admin route below.

async function requireAdmin(adminId) {

    if (!adminId) {
        return { ok: false, status: 400, message: "adminId is required" };
    }

    const admin = await User.findById(adminId);

    if (!admin) {
        return { ok: false, status: 404, message: "Admin user not found" };
    }

    if (admin.role !== "admin") {
        return { ok: false, status: 403, message: "Admin access only" };
    }

    return { ok: true };

}


// =====================================
// GET ALL USERS (students + hosts + admins)
// GET /api/admin/users?adminId=...
// =====================================
router.get("/users", async (req, res) => {

    try {

        const check = await requireAdmin(req.query.adminId);

        if (!check.ok) {
            return res.status(check.status).json({ message: check.message });
        }

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
// GET /api/admin/events?adminId=...
// =====================================
router.get("/events", async (req, res) => {

    try {

        const check = await requireAdmin(req.query.adminId);

        if (!check.ok) {
            return res.status(check.status).json({ message: check.message });
        }

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
// GET /api/admin/registrations?adminId=...
// =====================================
router.get("/registrations", async (req, res) => {

    try {

        const check = await requireAdmin(req.query.adminId);

        if (!check.ok) {
            return res.status(check.status).json({ message: check.message });
        }

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
// body: { adminId }
// =====================================
router.delete("/users/:id", async (req, res) => {

    try {

        const check = await requireAdmin(req.body.adminId);

        if (!check.ok) {
            return res.status(check.status).json({ message: check.message });
        }

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
// body: { adminId }
// =====================================
router.delete("/events/:id", async (req, res) => {

    try {

        const check = await requireAdmin(req.body.adminId);

        if (!check.ok) {
            return res.status(check.status).json({ message: check.message });
        }

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
// body: { adminId }
// =====================================
router.delete("/registrations/:id", async (req, res) => {

    try {

        const check = await requireAdmin(req.body.adminId);

        if (!check.ok) {
            return res.status(check.status).json({ message: check.message });
        }

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