// =====================================================================
// REAL-TIME HELPERS
//
// Socket messages are only a convenience "nudge" so a page can update
// without waiting for its next poll. The DATABASE is always the source
// of truth: every message here is also stored (notifications, events,
// registrations), and the frontend reloads from the database when it
// reconnects — so a missed socket message never loses anything.
//
// Every authenticated socket is placed in two kinds of room (see
// socketSecurity.js):  user:<id>  (just that person)  and  role:<role>.
// Messages are sent to those rooms, never to every connection.
// =====================================================================

let io = null;

function setIO(instance) {
    io = instance;
}

function userRoom(userId) {
    return `user:${userId}`;
}

function roleRoom(role) {
    return `role:${role}`;
}

// Send an event to specific people (de-duplicated).
function emitToUsers(userIds, eventName, payload = {}) {

    if (!io) return;

    const rooms = [...new Set(
        userIds.filter(Boolean).map(id => userRoom(String(id)))
    )];

    if (rooms.length === 0) return;

    io.to(rooms).emit(eventName, payload);

}

// Send an event to everyone with a given role (e.g. all students).
function emitToRole(role, eventName, payload = {}) {

    if (!io) return;

    io.to(roleRoom(role)).emit(eventName, payload);

}

module.exports = { setIO, userRoom, roleRoom, emitToUsers, emitToRole };