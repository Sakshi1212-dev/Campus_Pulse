// =====================================================================
// SOCKET.IO SECURITY
//   1. Only the origins listed in ALLOWED_ORIGINS may connect
//      (instead of the wildcard "*").
//   2. A socket must present a valid JWT. Anonymous connections are
//      refused, exactly like the REST API.
//   3. Each socket joins private rooms (user:<id>, role:<role>) so
//      messages go only to the people they are meant for.
//   4. A socket is disconnected when its token expires.
// =====================================================================

const jwt = require("jsonwebtoken");

const { userRoom, roleRoom } = require("./realtime");

function normalizeOrigin(origin) {
    return String(origin).trim().replace(/\/+$/, "");
}

// ALLOWED_ORIGINS is a comma-separated list, e.g.
//   ALLOWED_ORIGINS=https://campuspulse.example.com
// With nothing set, only this server on localhost is allowed.
function parseAllowedOrigins(value, port = 5000) {

    const raw = value && value.trim()
        ? value
        : `http://localhost:${port},http://127.0.0.1:${port}`;

    return raw.split(",").map(normalizeOrigin).filter(Boolean);

}

// A request with no Origin header (same-origin page loads, curl, mobile
// apps) is allowed through this check — it still has to pass the JWT
// check below. A browser on another website always sends its Origin.
function isOriginAllowed(origin, allowedOrigins) {

    if (!origin) return true;

    return allowedOrigins.includes(normalizeOrigin(origin));

}

// io.use(...) middleware: reject the connection unless the handshake
// carries a valid token:  io({ auth: { token } })
function authenticateSocket(socket, next) {

    const token = socket.handshake && socket.handshake.auth
        ? socket.handshake.auth.token
        : null;

    if (!token) {
        return next(new Error("Authentication required"));
    }

    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Identity comes from the verified token only.
        socket.user = {
            userId: String(decoded.userId),
            role: decoded.role,
            exp: decoded.exp
        };

        return next();

    } catch (error) {

        return next(new Error("Invalid or expired token"));

    }

}

// Put an authenticated socket into its private rooms, and make sure
// it can't outlive its token.
function setUpSocket(socket) {

    socket.join(userRoom(socket.user.userId));

    socket.join(roleRoom(socket.user.role));

    if (socket.user.exp) {

        // setTimeout can't hold more than ~24.8 days; tokens are shorter.
        const msLeft = Math.min(
            Math.max(socket.user.exp * 1000 - Date.now(), 0),
            2147483647
        );

        const timer = setTimeout(() => socket.disconnect(true), msLeft);

        if (timer.unref) timer.unref();

        socket.on("disconnect", () => clearTimeout(timer));

    }

}

module.exports = {
    parseAllowedOrigins,
    isOriginAllowed,
    authenticateSocket,
    setUpSocket
};