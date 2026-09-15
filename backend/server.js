// ================================
// IMPORTS
// ================================

require("dotenv").config();

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");

// ================================
// APP INIT
// ================================

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
const teamRoutes = require("./routes/teamRoutes");
const aiTeammateRoutes = require("./routes/aiTeammateRoutes");
const aiRecommendationRoutes = require("./routes/aiRecommendationRoutes");

app.use("/api/events", eventRoutes);
app.use("/api/users", userRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/ai-teammates", aiTeammateRoutes);
app.use("/api/ai-recommendations", aiRecommendationRoutes);

// ================================
// STATIC FRONTEND
// ================================

const frontendPath = path.resolve(__dirname, "../frontend");

console.log("SERVING FRONTEND FROM:", frontendPath);

app.use(express.static(frontendPath));

app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

// ================================
// ERROR HANDLING
// ================================

app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Something went wrong" });
});

// ================================
// SERVER
// ================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});