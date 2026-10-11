const express = require("express");
const router = express.Router();

const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");
const generateToken = require("../utils/generateToken");

// =====================================
// GET CURRENT LOGGED-IN USER
// GET /api/auth/me
// =====================================
//
// Used by the frontend on every page load/refresh to check:
// "is the token I saved still valid, and who does it belong
// to?" verifyToken already rejects a missing/expired/tampered
// token with 401 before this handler even runs.
router.get("/me", verifyToken, async (req, res) => {

    try {

        const user = await User.findById(req.user.userId).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // The role inside a JWT is fixed when it is issued. If an admin has
        // changed this person's role since then (for example by approving a
        // host request), send a fresh token so the new role takes effect
        // right away instead of only after the next manual login.
        const response = { user };

        if (user.role !== req.user.role) {
            response.token = generateToken(user);
        }

        res.status(200).json(response);

    } catch (error) {

        res.status(500).json({
            message: "Failed to fetch current user",
            error: error.message
        });

    }

});

module.exports = router;