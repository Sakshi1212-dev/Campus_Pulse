const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true
        },

        status: {
            type: String,
            default: "registered"
        },

        // Details from the registration form. The frontend was already
        // sending these, but they were silently dropped because the
        // schema had no fields for them.
        name: { type: String, trim: true, default: "" },
        branch: { type: String, trim: true, default: "" },
        year: { type: String, trim: true, default: "" },
        email: { type: String, trim: true, default: "" }
    },
    {
        timestamps: true
    }
);
registrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });
module.exports = mongoose.model(
    "Registration",
    registrationSchema
);