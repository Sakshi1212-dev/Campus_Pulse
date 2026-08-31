const express = require("express");
const router = express.Router();

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


        // Create user

        const user = new User({

            name,

            email: email.toLowerCase(),

            password,

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


        // Check password

        if (user.password !== password) {

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


module.exports = router;