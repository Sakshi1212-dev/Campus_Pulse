const mongoose = require("mongoose");

const realtime = require("../utils/realtime");

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

// Real-time "nudge": whenever a notification is saved ANYWHERE in the app
// (registration confirmed, host message, event cancelled, reminders...),
// tell that user's open pages to reload their notifications. The
// notification itself is already safely in the database — this message
// is only a shortcut, so if it is missed nothing is lost; the page also
// reloads on reconnect and on its normal poll.
// Wrapped in try/catch so a socket problem can never make saving fail.
notificationSchema.post("save", function (doc) {

    try {
        realtime.emitToUsers([doc.userId], "notification", {});
    } catch (error) {
        console.error("Realtime nudge failed:", error.message);
    }

});

notificationSchema.post("insertMany", function (docs) {

    try {
        realtime.emitToUsers(docs.map(doc => doc.userId), "notification", {});
    } catch (error) {
        console.error("Realtime nudge failed:", error.message);
    }

});

module.exports = mongoose.model("Notification", notificationSchema);