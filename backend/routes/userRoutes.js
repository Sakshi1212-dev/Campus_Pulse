const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const User = require("../models/User");

// =====================================
// GET ALL USERS
// =====================================

router.get("/", async (req, res) => {
    

    try {

        const users = await User.find().select("-password");

        res.status(200).json(users);

    } catch (error) {

        res.status(500).json({
            message: "Failed to fetch users",
            error: error.message
        });

    }

});


// =====================================
// SIGNUP
// =====================================

router.post("/signup", async (req, res) => {

    try {

        const {
            name,
            email,
            password,
            role,
            college,
            course,
            skills
        } = req.body;


        // Check required fields

        if (!name || !email || !password || !college) {

            return res.status(400).json({
                message: "Please fill all required fields"
            });

        }


        // Check if user already exists

        const existingUser = await User.findOne({
            email: email.toLowerCase()
        });

        if (existingUser) {

            return res.status(400).json({
                message: "Email already registered"
            });

        }


        // Hash the password before saving — never store plain text

        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(password, salt);


        // Create user

        const user = new User({

            name,

            email: email.toLowerCase(),

            password: hashedPassword,

            role: role === "host" ? "host" : "student",

            college,

            course: course || "",

            skills: skills || []

        });


        const savedUser = await user.save();


        // Don't send password back

        const userResponse = {
            _id: savedUser._id,
            name: savedUser.name,
            email: savedUser.email,
            role: savedUser.role,
            college: savedUser.college,
            course: savedUser.course,
            skills: savedUser.skills
        };


        res.status(201).json({

            message: "Account created successfully",

            user: userResponse

        });

    } catch (error) {

        console.log("SIGNUP ERROR:", error);

        res.status(500).json({

            message: "Signup failed",

            error: error.message

        });

    }

});


// =====================================
// LOGIN
// =====================================

router.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        // Check fields

        if (!email || !password) {

            return res.status(400).json({

                message: "Email and password are required"

            });

        }


        // Find user

        const user = await User.findOne({

            email: email.toLowerCase()

        });


        if (!user) {

            return res.status(401).json({

                message: "Invalid email or password"

            });

        }


        // Check password against the hashed version in the DB

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {

            return res.status(401).json({

                message: "Invalid email or password"

            });

        }


        // Don't send password

        const userResponse = {

            _id: user._id,

            name: user.name,

            email: user.email,

            role: user.role,

            college: user.college,

            course: user.course,

            skills: user.skills

        };


        res.status(200).json({

            message: "Login successful",

            user: userResponse

        });

    } catch (error) {

        console.log("LOGIN ERROR:", error);

        res.status(500).json({

            message: "Login failed",

            error: error.message

        });

    }

});


// =====================================
// UPDATE PROFILE
// =====================================

router.put("/:id", async (req, res) => {

    try {

        const { name, college, course, skills } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {

            return res.status(404).json({
                message: "User not found"
            });

        }

        // Only these fields are editable here.
        // Email and role are intentionally left out.

        if (name !== undefined) user.name = name;
        if (college !== undefined) user.college = college;
        if (course !== undefined) user.course = course;
        if (skills !== undefined) user.skills = skills;

        const updatedUser = await user.save();

        const userResponse = {
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            college: updatedUser.college,
            course: updatedUser.course,
            skills: updatedUser.skills,
            createdAt: updatedUser.createdAt
        };

        res.status(200).json({

            message: "Profile updated successfully",

            user: userResponse

        });

    } catch (error) {

        console.log("UPDATE PROFILE ERROR:", error);

        res.status(500).json({

            message: "Failed to update profile",

            error: error.message

        });

    }

});


module.exports = router;
