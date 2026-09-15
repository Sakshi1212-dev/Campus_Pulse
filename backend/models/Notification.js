const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        // Who this notification is for
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        message: {
            type: String,
            required: true
        },

        type: {
            type: String,
            default: "general" // e.g. "team_interest"
        },

        // Optional reference to whatever this notification
        // is about (a team request, an event, etc.)
        relatedId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },

        isRead: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Notification", notificationSchema);