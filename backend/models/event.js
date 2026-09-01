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
        
    },
    
    {
        timestamps: true
    }
);
module.exports = mongoose.model("Event", eventSchema);