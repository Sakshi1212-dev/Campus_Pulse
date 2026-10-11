const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true
        },

        category: {
            type: String,
            required: true
        },

        description: {
            type: String,
            required: true
        },

        venue: {
            type: String,
            required: true
        },

        date: {
            type: Date,
            required: true
        },

        capacity: {
            type: Number,
            default: 100
        },
        // Host who created this event
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Used so the server only sends the "event started" /
        // "event ended" popup ONCE per event, not every time
        // it checks.
        startNotified: {
            type: Boolean,
            default: false
        },

        endNotified: {
            type: Boolean,
            default: false
        },

        // "cancelled" is used instead of hard-deleting an event
        // that already has registrations, so students' history,
        // attendance, and certificates aren't wiped out along
        // with it. Hard delete still happens for events with no
        // registrations yet.
        // Where the event is in its life — see utils/eventLifecycle.js for
        // the full rules (what each status means and what happens to the
        // registrations).  active -> full -> completed (archived),
        // or -> cancelled.  Events are archived, never deleted, once
        // students have registered.
        status: {
            type: String,
            enum: ["active", "full", "completed", "cancelled"],
            default: "active"
        },

        // When it was archived / cancelled (for the record).
        archivedAt: {
            type: Date
        },

        cancelledAt: {
            type: Date
        },

    },
    
    {
        timestamps: true
    }
);

// Speeds up: filtering by category, sorting/filtering by date
// (used by the events list, recommendations, and the
// eventStarted/eventEnded background check in server.js)
eventSchema.index({ category: 1 });
eventSchema.index({ date: 1 });
eventSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Event", eventSchema);