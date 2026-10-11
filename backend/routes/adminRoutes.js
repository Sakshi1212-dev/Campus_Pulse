const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const mongoose = require("mongoose");
const Notification = require("../models/Notification");
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


// =====================================
// HOST REQUESTS
// =====================================
//
// Hosts are not created by public signup. A person who asked for
// host access at signup has hostRequestStatus "pending", and only an
// admin (this router is admin-only) can approve or reject it.

// LIST PENDING HOST REQUESTS
// GET /api/admin/host-requests
router.get("/host-requests", async (req, res) => {

    try {

        const pending = await User.find({ hostRequestStatus: "pending", role: "student" })
            .select("-password")
            .sort({ createdAt: -1 });

        res.status(200).json(pending);

    } catch (error) {

        console.error("LIST HOST REQUESTS ERROR:", error);

        res.status(500).json({ message: "Something went wrong" });

    }

});


// APPROVE OR REJECT ONE REQUEST
// PUT /api/admin/host-requests/:id/approve
// PUT /api/admin/host-requests/:id/reject
async function decideHostRequest(req, res, approve) {

    try {

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        // The filter means only a student with a PENDING request can be
        // changed — an admin or an existing host can't be hit by mistake.
        const user = await User.findOneAndUpdate(
            { _id: req.params.id, role: "student", hostRequestStatus: "pending" },
            approve
                ? { role: "host", hostRequestStatus: "approved" }
                : { hostRequestStatus: "rejected" },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({ message: "No pending host request found for this user" });
        }

        try {

            await Notification.create({
                userId: user._id,
                type: approve ? "host_request_approved" : "host_request_rejected",
                message: approve
                    ? "🎉 Your request for Host access was approved. You can now create events."
                    : "Your request for Host access was not approved."
            });

        } catch (notifyError) {

            console.error("Failed to notify user about host request:", notifyError);

        }

        res.status(200).json({
            message: approve ? "Host request approved" : "Host request rejected",
            user
        });

    } catch (error) {

        console.error("DECIDE HOST REQUEST ERROR:", error);

        res.status(500).json({ message: "Something went wrong" });

    }

}

router.put("/host-requests/:id/approve", (req, res) => decideHostRequest(req, res, true));

router.put("/host-requests/:id/reject", (req, res) => decideHostRequest(req, res, false));


module.exports = router;