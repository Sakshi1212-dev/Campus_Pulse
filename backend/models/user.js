const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },

        email: {
           type: String,
           required: true,
           unique: true,
           lowercase: true,
           trim: true
        },
           password: {
            type: String,
            required: true
        },

        role: {
            type: String,
            enum: ["student", "host", "admin"],
            default: "student"
        },

        college: {
            type: String,
            required: true
        },

        course: {
            type: String,
            default: ""
        },

        skills: {
            type: [String],
            default: []
        },

        // Public signup can NEVER create a host. A person who ticks
        // "Host" at signup becomes a normal student with
        // hostRequestStatus "pending"; only an admin can approve the
        // request, which is what changes role to "host".
        hostRequestStatus: {
            type: String,
            enum: ["none", "pending", "approved", "rejected"],
            default: "none"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);