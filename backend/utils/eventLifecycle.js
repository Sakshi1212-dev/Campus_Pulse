// =====================================================================
// EVENT LIFECYCLE — the single place that defines what happens to an
// event, and to the registrations attached to it, at every stage.
//
//   STATUS      MEANING                      SHOWN IN   NEW         REGISTRATIONS
//                                            LISTS?     SIGN-UPS?
//   ---------   --------------------------   --------   ---------   ----------------------------------
//   active      upcoming, seats left         yes        yes         kept; students may cancel theirs
//   full        upcoming, no seats left      yes        no          kept; reopens to "active" the moment
//                                                                   someone cancels
//   completed   the date has passed          no         no          kept FOREVER as participation
//   (archived)  (archived, never deleted)                           history; cannot be cancelled
//   cancelled   host/admin removed it AFTER  no         no          kept; every registered student is
//               students had registered                             notified
//
//   An event nobody registered for can simply be deleted.
//   An event that has already taken place and has registrations is
//   never deleted — it is history.
//
// The database is the source of truth. "full" is only a cached label
// derived from the real registration count, and repairCapacityStatuses()
// re-derives it, so a missed update can never leave it wrong for long.
// =====================================================================

const Event = require("../models/Event");
const Registration = require("../models/Registration");
const Notification = require("../models/Notification");

const OPEN_STATUSES = ["active", "full"];

// How long after its start time an event stays listed before it is
// archived. 0 = archived the moment it starts (the current behaviour).
// Set ARCHIVE_GRACE_HOURS=3 to keep an event visible while it runs.
function archiveGraceHours() {

    const hours = Number(process.env.ARCHIVE_GRACE_HOURS);

    return Number.isFinite(hours) && hours >= 0 ? hours : 0;

}

function archiveCutoff(now = new Date()) {

    return new Date(now.getTime() - archiveGraceHours() * 60 * 60 * 1000);

}

function isPast(event, now = new Date()) {

    return new Date(event.date) < archiveCutoff(now);

}

// Why a student can NOT sign up for / cancel a registration for this
// event — or null if the event is still open. (Whether it is FULL is
// decided separately from the real registration count.)
function closedReason(event, now = new Date()) {

    if (!event) return "Event not found";

    if (event.status === "cancelled") return "This event was cancelled";

    if (event.status === "completed" || isPast(event, now)) {
        return "This event has already taken place";
    }

    return null;

}

// Make the cached "active"/"full" label match the real count.
// Only ever flips between those two — completed/cancelled are never
// touched, and the conditional update means a concurrent change to
// completed/cancelled can't be overwritten.
async function reconcileCapacityStatus(eventId) {

    const event = await Event.findById(eventId);

    if (!event || !OPEN_STATUSES.includes(event.status)) {
        return event ? event.status : null;
    }

    const count = await Registration.countDocuments({ eventId });

    const shouldBe = count >= event.capacity ? "full" : "active";

    if (shouldBe !== event.status) {

        await Event.updateOne(
            { _id: eventId, status: { $in: OPEN_STATUSES } },
            { $set: { status: shouldBe } }
        );

    }

    return shouldBe;

}

// Archive (never delete) every event whose date has passed.
async function archivePastEvents(now = new Date()) {

    const result = await Event.updateMany(
        {
            date: { $lt: archiveCutoff(now) },
            status: { $in: OPEN_STATUSES }
        },
        {
            $set: { status: "completed", archivedAt: now }
        }
    );

    return (result && (result.modifiedCount ?? result.nModified)) || 0;

}

// Self-healing pass: re-derive active/full for every open event from
// the real registration counts. Fixes drift caused by a crash between
// "save registration" and "update status", or by a capacity change.
async function repairCapacityStatuses() {

    const openEvents = await Event.find({ status: { $in: OPEN_STATUSES } });

    if (openEvents.length === 0) return 0;

    const counts = await Registration.aggregate([
        { $match: { eventId: { $in: openEvents.map(event => event._id) } } },
        { $group: { _id: "$eventId", count: { $sum: 1 } } }
    ]);

    const countByEvent = {};

    counts.forEach(entry => { countByEvent[String(entry._id)] = entry.count; });

    let fixed = 0;

    for (const event of openEvents) {

        const count = countByEvent[String(event._id)] || 0;

        const shouldBe = count >= event.capacity ? "full" : "active";

        if (shouldBe !== event.status) {

            await Event.updateOne(
                { _id: event._id, status: { $in: OPEN_STATUSES } },
                { $set: { status: shouldBe } }
            );

            fixed++;

        }

    }

    return fixed;

}

// The one rule for "a host/admin removes an event", so the host route
// and the admin route can never disagree:
//   - nobody registered           -> delete it
//   - already taken place + has registrations -> refuse (it is history)
//   - upcoming + has registrations -> cancel it, keep every registration,
//                                     and tell the registered students
async function removeOrCancelEvent(event) {

    const registrationCount =
        await Registration.countDocuments({ eventId: event._id });

    if (registrationCount === 0) {

        await Event.deleteOne({ _id: event._id });

        return { action: "deleted", registrations: 0 };

    }

    if (event.status === "completed" || isPast(event)) {

        return { action: "kept", registrations: registrationCount };

    }

    await Event.updateOne(
        { _id: event._id },
        { $set: { status: "cancelled", cancelledAt: new Date() } }
    );

    const registrations = await Registration.find({ eventId: event._id });

    if (registrations.length > 0) {

        await Notification.insertMany(registrations.map(registration => ({
            userId: registration.userId,
            type: "event_cancelled",
            message: `"${event.title}" was cancelled by the organiser. Your registration has been kept on record.`,
            relatedId: event._id
        })));

    }

    return { action: "cancelled", registrations: registrationCount };

}

module.exports = {
    OPEN_STATUSES,
    archiveGraceHours,
    archiveCutoff,
    isPast,
    closedReason,
    reconcileCapacityStatus,
    archivePastEvents,
    repairCapacityStatuses,
    removeOrCancelEvent
};