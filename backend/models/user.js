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
            unique: true
        },
           password: {
            type: String,
            required: true
        },

        role: {
            type: String,
            enum: ["student", "host"],
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
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);