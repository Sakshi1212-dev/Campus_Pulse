// ================================
// IMPORTS
// ================================

require("dotenv").config();

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

// ================================
// APP INIT
// ================================

const app = express();

// Create a raw HTTP server wrapping the Express app, so
// Socket.IO can attach to the SAME server/port (still
// localhost:5000) instead of needing a separate one.
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id);
    });
});

// Make `io` available inside route files via req.app.get("io")
app.set("io", io);

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
const notificationRoutes = require("./routes/notificationRoutes");
const eventMessageRoutes = require("./routes/eventMessageRoutes");
const adminRoutes = require("./routes/adminRoutes");

app.use("/api/events", eventRoutes);
app.use("/api/users", userRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/ai-teammates", aiTeammateRoutes);
app.use("/api/ai-recommendations", aiRecommendationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/events", eventMessageRoutes);
app.use("/api/admin", adminRoutes);

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

// IMPORTANT: listen on `server` (not `app`) now, since
// Socket.IO is attached to the raw HTTP server.
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});