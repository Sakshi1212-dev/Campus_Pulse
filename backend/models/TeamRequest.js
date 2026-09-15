const mongoose = require("mongoose");

const teamRequestSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        projectTitle: {
            type: String,
            required: true
        },

        description: {
            type: String,
            required: true
        },

        skillsNeeded: {
            type: [String],
            default: []
        },

        // Students who clicked "Request to Join" on this post.
        // Only the poster sees this list.
        interestedUsers: {
            type: [
                {
                    userId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "User"
                    },
                    message: {
                        type: String,
                        default: ""
                    },
                    createdAt: {
                        type: Date,
                        default: Date.now
                    }
                }
            ],
            default: []
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("TeamRequest", teamRequestSchema);