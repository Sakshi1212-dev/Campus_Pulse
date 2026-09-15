const Notification = require("../models/Notification");

/**
 * Create a notification. Never throws — a failed notification
 * should not break the main request (registration, interest, etc).
 *
 * await notify({
 *   userId: teamRequest.userId,     // who receives it
 *   actorId: interestedUserId,      // who caused it (optional, skips self-notify)
 *   type: "team_interest",
 *   message: `${name} is interested in your request "${title}"`,
 *   relatedId: teamRequest._id,
 * });
 */
async function notify({ userId, actorId, type = "general", message, relatedId = null }) {
    try {
        if (!userId || !message) return null;

        // don't notify yourself about your own action
        if (actorId && String(actorId) === String(userId)) return null;

        return await Notification.create({
            userId,
            type,
            message,
            relatedId,
        });
    } catch (err) {
        console.error("Notification create failed:", err.message);
        return null;
    }
}

module.exports = notify;