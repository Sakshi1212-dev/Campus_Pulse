const express = require("express");
const router = express.Router();

const TeamRequest = require("../models/TeamRequest");
const User = require("../models/User");
const Notification = require("../models/Notification");

// =====================================
// POST A TEAMMATE REQUEST
// POST /api/teams
// =====================================
router.post("/", async (req, res) => {

    try {

        const { userId, projectTitle, description, skillsNeeded } = req.body;

        if (!userId || !projectTitle || !description) {
            return res.status(400).json({
                message: "userId, projectTitle, and description are required"
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const newRequest = new TeamRequest({
            userId,
            projectTitle,
            description,
            skillsNeeded: skillsNeeded || []
        });

        const savedRequest = await newRequest.save();

        res.status(201).json(savedRequest);

    } catch (error) {

        console.error("CREATE TEAM REQUEST ERROR:", error);

        res.status(500).json({
            message: "Failed to create teammate request",
            error: error.message
        });

    }

});


// =====================================
// GET ALL TEAMMATE REQUESTS (visible to everyone)
// GET /api/teams
// =====================================
router.get("/", async (req, res) => {

    try {

        const requests = await TeamRequest.find()
            .populate("userId", "name college course skills role")
            .populate("interestedUsers.userId", "name college skills")
            .sort({ createdAt: -1 });

        res.status(200).json(requests);

    } catch (error) {

        console.error("GET TEAM REQUESTS ERROR:", error);

        res.status(500).json({
            message: "Failed to fetch teammate requests",
            error: error.message
        });

    }

});


// =====================================
// REQUEST TO JOIN A SPECIFIC TEAM
// POST /api/teams/:id/interest
// body: { userId, message }
// =====================================
router.post("/:id/interest", async (req, res) => {

    try {

        const { userId, message } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "userId is required" });
        }

        const request = await TeamRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (request.userId.toString() === userId) {
            return res.status(400).json({
                message: "You can't request to join your own post"
            });
        }

        const alreadyRequested = request.interestedUsers.some(
            entry => entry.userId.toString() === userId
        );

        if (alreadyRequested) {
            return res.status(400).json({
                message: "You've already requested to join this team"
            });
        }

        request.interestedUsers.push({
            userId,
            message: message || ""
        });

        await request.save();

        // Notify the poster that someone wants to join
        try {

            const requester = await User.findById(userId);

            await Notification.create({
                userId: request.userId, // the poster receives this
                message: `${requester ? requester.name : "A student"} requested to join your team for "${request.projectTitle}"`,
                type: "team_interest",
                relatedId: request._id
            });

        } catch (notifyError) {

            // Don't fail the whole request just because the
            // notification failed to save — the join request
            // itself already succeeded.
            console.error("Failed to create notification:", notifyError);

        }

        res.status(200).json({ message: "Request sent!" });

    } catch (error) {

        console.error("TEAM INTEREST ERROR:", error);

        res.status(500).json({
            message: "Failed to send request",
            error: error.message
        });

    }

});


// =====================================
// DELETE OWN TEAMMATE REQUEST
// DELETE /api/teams/:id
// body: { userId }
// =====================================
router.delete("/:id", async (req, res) => {

    try {

        const { userId } = req.body;

        const request = await TeamRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (request.userId.toString() !== userId) {
            return res.status(403).json({
                message: "You can only delete your own request"
            });
        }

        await TeamRequest.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: "Teammate request deleted" });

    } catch (error) {

        console.error("DELETE TEAM REQUEST ERROR:", error);

        res.status(500).json({
            message: "Failed to delete request",
            error: error.message
        });

    }

});


module.exports = router;