
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");

require("dotenv").config();

const app = express();

// ================================
// MIDDLEWARE
// ================================

app.use(cors());
app.use(express.json());

// ================================
// DATABASE CONNECTION
// ================================

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch((error) => {
        console.log("MongoDB connection error:", error);
    });

// ================================
// ROUTES
// ================================

const eventRoutes = require("./routes/eventRoutes");
const userRoutes = require("./routes/userRoutes");
const registrationRoutes = require("./routes/registrationRoutes");

app.use("/api/events", eventRoutes);
app.use("/api/users", userRoutes);
app.use("/api/registrations", registrationRoutes);

// ================================
// HOME ROUTE
// ================================
app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ================================
// SERVER
// ================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});