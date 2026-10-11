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

        // Only start the event start/end/completed background
        // checker once the database connection is actually
        // ready. Starting it immediately at server boot (before
        // this .then() fires) meant its very first query could
        // run before MongoDB had finished connecting, which
        // throws a "buffering timed out" error if the connection
        // takes more than a few seconds.
        setInterval(checkEventStartAndEnd, 60 * 1000); // every 60 seconds

        checkEventStartAndEnd(); // also run once immediately

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
const authRoutes = require("./routes/authRoutes");

app.use("/api/events", eventRoutes);
app.use("/api/users", userRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/ai-teammates", aiTeammateRoutes);
app.use("/api/ai-recommendations", aiRecommendationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/events", eventMessageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);

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
// REAL-TIME: EVENT STARTED / EVENT ENDED
// ================================
//
// Runs every 60 seconds. For any event whose start time has
// just passed, broadcasts "eventStarted" once. For any event
// whose start time + EVENT_DEFAULT_DURATION_HOURS has just
// passed, broadcasts "eventEnded" once. Uses startNotified /
// endNotified flags on the Event document so the same event
// never triggers the popup twice, even across server restarts.
//
// NOTE: this assumes your Event model only stores a single
// `date` (start time), not a separate end time. If you later
// add a real `endDate` field, replace the calculated
// `endTime` below with `event.endDate`.

const Event = require("./models/Event");

const EVENT_DEFAULT_DURATION_HOURS =
    Number(process.env.EVENT_DEFAULT_DURATION_HOURS) || 3;

async function checkEventStartAndEnd() {

    try {

        const now = new Date();

        // ---- EVENT STARTED ----
        const startingEvents = await Event.find({
            date: { $lte: now },
            startNotified: { $ne: true }
        });

        for (const event of startingEvents) {

            io.emit("eventStarted", {
                eventId: event._id,
                title: event.title
            });

            // updateOne (not event.save()) only touches this one
            // field and skips re-validating the whole document —
            // some older events in the database may be missing
            // unrelated required fields, and save() would refuse
            // to update anything on those until that's fixed too.
            await Event.updateOne(
                { _id: event._id },
                { $set: { startNotified: true } }
            );

            console.log("Broadcast eventStarted:", event.title);

        }

        // ---- EVENT ENDED ----
        const allUnendedEvents = await Event.find({
            endNotified: { $ne: true }
        });

        for (const event of allUnendedEvents) {

            const endTime = new Date(
                new Date(event.date).getTime() +
                EVENT_DEFAULT_DURATION_HOURS * 60 * 60 * 1000
            );

            if (endTime <= now) {

                io.emit("eventEnded", {
                    eventId: event._id,
                    title: event.title
                });

                await Event.updateOne(
                    { _id: event._id },
                    { $set: { endNotified: true } }
                );

                console.log("Broadcast eventEnded:", event.title);

            }

        }

        // ---- MARK PAST EVENTS AS COMPLETED ----
        // As soon as an event's date/time has passed, hide it
        // from the normal event list by flipping it to
        // "completed" — same idea as "cancelled": the event and
        // its registrations stay in the database (history,
        // certificates, etc.), it just stops showing up as
        // something upcoming. Only touches events still marked
        // "active"/"full" so an already-cancelled event isn't
        // relabeled.
        await Event.updateMany(
            {
                date: { $lt: now },
                status: { $in: ["active", "full"] }
            },
            {
                $set: { status: "completed" }
            }
        );

    } catch (error) {

        console.error("Event start/end check failed:", error.message);

    }

}

// (checkEventStartAndEnd is started from inside the MongoDB
// .then() above, once the connection is confirmed ready —
// see the DATABASE CONNECTION section near the top.)

// ================================
// SERVER
// ================================

const PORT = process.env.PORT || 5000;

// IMPORTANT: listen on `server` (not `app`) now, since
// Socket.IO is attached to the raw HTTP server.
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});