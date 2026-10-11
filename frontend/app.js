// ==========================================
// 0. ADMIN UI STATE
// ==========================================
//
// Declared here at the very top so it's available before
// applyRolePermissions() (which runs on page load) tries
// to read it. A `let` declared later in the file is NOT
// accessible earlier in execution order — that caused a
// "Cannot access before initialization" crash that broke
// the entire script, including login.

let adminUIInjected = false;


// ==========================================
// 1. PAGE NAVIGATION
// ==========================================

const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");
const pageButtons = document.querySelectorAll("[data-page]");


// Function to show a page
function showPage(pageName) {

    // Query fresh each time (not the module-level `pages`/
    // `navItems` captured at page load) so dynamically
    // injected elements — like the Admin page/nav button,
    // which only exist after an admin logs in — are
    // included correctly.

    const currentPages =
        document.querySelectorAll(".page");

    const currentNavItems =
        document.querySelectorAll(".nav-item");


    // Hide all pages
    currentPages.forEach(page => {
        page.classList.remove("active");
    });

    // Show selected page
    const selectedPage = document.getElementById(
        `page-${pageName}`
    );

    if (selectedPage) {
        selectedPage.classList.add("active");
    }


    // Remove active from sidebar
    currentNavItems.forEach(item => {
        item.classList.remove("active");
    });


    // Add active to selected sidebar item
    currentNavItems.forEach(item => {

        if (item.dataset.page === pageName) {
            item.classList.add("active");
        }

    });

}


// Add click event to all elements having data-page
pageButtons.forEach(button => {

    button.addEventListener("click", () => {

        const pageName = button.dataset.page;

        showPage(pageName);

    });

});


// ==========================================
// MARK ALL NOTIFICATIONS READ WHEN OPENING
// THE NOTIFICATIONS PAGE (badge -> 0, but the
// list still shows everything that ever arrived)
// ==========================================

document.querySelectorAll('[data-page="notifications"]').forEach(button => {

    button.addEventListener("click", async function () {

        const currentUser = getCurrentUser();

        if (!currentUser) return;

        try {

            await authFetch(
                `http://localhost:5000/api/notifications/read-all/${currentUser._id}`,
                { method: "PUT" }
            );

            // Refresh list + badge now that everything is read
            loadNotifications();

        } catch (error) {

            console.error("Mark all read error:", error);

        }

    });

});


// ==========================================
// 2. SEARCH EVENTS
// ==========================================

const searchInput = document.getElementById("searchInput");

if (searchInput) {

    searchInput.addEventListener("input", function () {

        const searchText =
            this.value.toLowerCase().trim();

        const eventCards =
            document.querySelectorAll(".event-card");


        eventCards.forEach(card => {

            const text =
                card.innerText.toLowerCase();


            if (text.includes(searchText)) {

                card.style.display = "";

            } else {

                card.style.display = "none";

            }

        });

    });

}


// ==========================================
// 3. TOAST MESSAGE
// ==========================================

const toast =
    document.getElementById("toast");


// Toasts now queue instead of overwriting each other. If
// "Event registered!" and "🔔 New notification!" both fire
// within a second of each other, both get shown in full,
// one after another, instead of the second silently
// replacing the first before it was readable.

let toastQueue = [];
let toastShowing = false;

function showToast(message) {

    if (!toast) return;

    toastQueue.push(message);

    processToastQueue();

}

function processToastQueue() {

    if (toastShowing || toastQueue.length === 0) {
        return;
    }

    toastShowing = true;

    const message = toastQueue.shift();

    toast.innerText = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

        // Small gap between toasts so it's clear a new
        // message started, not just text flickering
        setTimeout(() => {

            toastShowing = false;

            processToastQueue();

        }, 300);

    }, 3000);

}


// ==========================================
// 4. CREATE EVENT FORM (HOST ONLY)
// ==========================================


const eventForm = document.getElementById("eventForm");

if (eventForm) {

    eventForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        const currentUser = getCurrentUser();

        if (!currentUser) {
            alert("Please login first.");
            return;
        }

        if (currentUser.role !== "host") {
            alert("Only hosts can create events.");
            return;
        }

        const formData = new FormData(eventForm);

        const eventData = {
           title: formData.get("title"),
           category: formData.get("category"),
           description: formData.get("description"),
           venue: formData.get("venue"),
           date: formData.get("date"),
           capacity: Number(formData.get("capacity"))
        };

        console.log("Event being sent:", eventData);

        try {

            const response = await fetch("http://localhost:5000/api/events", authHeaders({

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(eventData)

            }));

            const data = await response.json();

            console.log("Backend response:", data);

            if (response.ok) {

                alert("Event published successfully! 🎉");

                eventForm.reset();

                showPage("events");

                loadEvents();

            } else {

                alert(
                    data.message || "Failed to publish event"
                );

            }

        } catch (error) {

            console.error("Error:", error);

            alert("Could not connect to backend.");

        }

    });

}

// ==========================================
// 5. NOTIFICATION COUNT
// ==========================================

const notificationCount =
    document.getElementById("notificationCount");

const notificationBadge =
    document.getElementById("notificationBadge");


function updateNotificationCount(count) {

    if (notificationCount) {
        notificationCount.innerText = count;
    }

    if (notificationBadge) {
        notificationBadge.innerText = count;
    }

}


// ==========================================
// 6. NOTIFICATION CLICK
// ==========================================
// (Removed dead static code here — notifications are
// loaded dynamically. See loadNotifications() further down
// for the real implementation.)


// ==========================================
// 7. CATEGORY BUTTONS
// ==========================================

const categories =
    document.querySelectorAll(".category");


// The labels shown on the Popular Categories cards ("Technical",
// "Workshops") don't always match the exact category value events
// are saved with ("Hackathon", "Workshop"). This maps display
// label -> actual stored category, so the filter below matches
// real events. If you add new categories on the event-creation
// form, add a matching entry here too.
const categoryLabelMap = {
    "Technical": "Hackathon",
    "Cultural": "Cultural",
    "Sports": "Sports",
    "Workshops": "Workshop",
    "Career": "Career"
};


categories.forEach(category => {

    category.addEventListener("click", function () {

        // Read the label from the <strong> tag specifically,
        // not the whole button text (which also contains the
        // emoji on its own line and would give the wrong value).
        const labelElement = this.querySelector("strong");

        const categoryLabel =
            labelElement ? labelElement.innerText.trim() : "";

        const searchTerm =
            categoryLabelMap[categoryLabel] || categoryLabel;


        showPage("events");


        // Reuse the existing Events-page search box to do the
        // actual filtering, so there's only one filtering logic
        // to maintain. Setting .value alone doesn't fire the
        // "input" listener, so we dispatch it manually.
        if (searchInput) {

            searchInput.value = searchTerm;

            searchInput.dispatchEvent(
                new Event("input", { bubbles: true })
            );

        }


        showToast(
            `Showing ${categoryLabel} events`
        );

    });

});


// ==========================================
// 8. TEAM INVITATION
// ==========================================
// (Removed dead code here — team cards are loaded
// dynamically, so a static querySelectorAll at page load
// never found any real cards. The actual Find Teammates
// logic — posting requests, loading them publicly, and
// AI matching — lives further down in this file.)


// ==========================================
// 9. CURRENT USER HELPER
// ==========================================

function getCurrentUser() {

    try {

        return JSON.parse(
            localStorage.getItem("campusUser")
        );

    } catch (error) {

        return null;

    }

}

// The JWT issued at login/signup, sent as
// "Authorization: Bearer <token>" on protected requests.
function getToken() {

    return localStorage.getItem("campusToken");

}

// Small helper so protected fetch calls don't repeat this
// header block everywhere. Usage:
//   fetch(url, authHeaders({ method: "POST", body: ... }))
function authHeaders(options = {}) {

    return {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${getToken()}`
        }
    };

}


// ==========================================
// AUTHENTICATED FETCH WRAPPER
// ==========================================
//
// Use this instead of a plain fetch() for any request that
// needs the logged-in user's identity. It automatically:
//   1. attaches the saved JWT as an Authorization header
//   2. detects a 401 (no token / expired token / invalid
//      token) coming back from the backend
//   3. on 401, clears the stored session and sends the
//      person back to the login screen with a clear message
//      — instead of leaving the app in a broken half-logged-in
//      state.
//
// Usage is the same as fetch():
//   const res = await authFetch(url);
//   const res = await authFetch(url, { method: "POST", body: ... });
async function authFetch(url, options = {}) {

    const response = await fetch(url, authHeaders(options));

    if (response.status === 401) {

        endSession("Your session has expired. Please login again.");

    }

    return response;

}


// ==========================================
// SESSION HELPERS (login restore / logout)
// ==========================================

// Clears any saved session and shows the login screen. Used
// both by the Logout button and automatically by authFetch()
// whenever the backend says the token is no longer valid.
function endSession(message) {

    localStorage.removeItem("campusToken");
    localStorage.removeItem("campusUser");

    const authScreenEl = document.getElementById("authScreen");

    if (authScreenEl) {
        authScreenEl.style.display = "flex";
    }

    if (message) {
        alert(message);
    }

}


// Runs once when the page loads (including on refresh). This
// is the single place that decides: does the dashboard show,
// or does the login screen show?
//
// Step 1 (instant, no network needed): if a user + token are
// already saved from a previous login, show the dashboard
// right away using that saved data — this is why refreshing
// doesn't bounce you back to login anymore.
//
// Step 2 (in the background): ask the backend "is this token
// actually still valid?" via GET /api/auth/me. A token can
// look fine in localStorage but still be expired or revoked,
// so we don't blindly trust it forever — if the backend says
// no (401), authFetch() above automatically logs the person
// out and shows the login screen with an explanation.
async function initializeApp() {

    const savedUser = getCurrentUser();
    const savedToken = getToken();

    const authScreenEl = document.getElementById("authScreen");

    if (!savedUser || !savedToken) {

        // Nothing saved — this is a normal logged-out visit.
        if (authScreenEl) authScreenEl.style.display = "flex";

        return;

    }

    // We have something saved — restore the dashboard
    // immediately so the page doesn't flash the login screen.
    if (authScreenEl) authScreenEl.style.display = "none";

    showUserDashboard(savedUser);

    applyRolePermissions();

    // Now quietly confirm with the backend that this token is
    // still good. If it isn't, authFetch handles logging out.
    try {

        const response = await authFetch("http://localhost:5000/api/auth/me");

        if (response.ok) {

            const data = await response.json();

            // Keep localStorage in sync with the latest data
            // from the database (e.g. if skills/role changed).
            localStorage.setItem("campusUser", JSON.stringify(data.user));

            // The server sends a new token only when this person's role
            // changed since they logged in (e.g. a host request was
            // approved). Save it and reload once so the whole app starts
            // up with the new role and permissions.
            if (data.token) {
                localStorage.setItem("campusToken", data.token);
                window.location.reload();
                return;
            }

        }

    } catch (error) {

        console.error("Session check failed:", error);

    }

}

// Run it now, as soon as the script loads — this is what
// makes a refresh restore the dashboard instead of dropping
// back to the login screen.
initializeApp();


// ==========================================
// 10. CREATE EVENT CARD (reusable)
//     Used by Events page, Recommended For
//     You, and Made For You / Recommendations
// ==========================================

function createEventCard(event, currentUser, isHost, matchPercent, matchReason) {

    const eventCard =
        document.createElement("div");

    eventCard.className = "event-card";

    // Only hosts who own the event get a Delete button.
    // Everyone else (students, or hosts viewing others'
    // events) gets a Register button.
    const isOwner =
        isHost &&
        currentUser &&
        event.createdBy === currentUser._id;

    const actionButtonHTML = isOwner
        ? `<div style="display:flex; gap:8px;">
                <button
                    class="register-btn message-attendees-btn"
                    data-event-id="${event._id}"
                    style="background:#171c2f; flex:1;"
                >
                    ✉️ Message Attendees
                </button>
                <button
                    class="register-btn delete-event-btn"
                    data-event-id="${event._id}"
                    style="background:#e34267;"
                >
                    Delete
                </button>
           </div>`
        : (() => {

            const isFull = event.status === "full";

            const disabled = isHost || isFull;

            const label = isHost
                ? "Hosts can't register"
                : isFull
                    ? "Event Full"
                    : "Register Now";

            return `<button
                class="register-btn event-register-btn"
                data-event-id="${event._id}"
                ${disabled ? "disabled style=\"opacity:0.5;cursor:not-allowed;\"" : ""}
           >
                ${label}
           </button>`;

        })();

    // matchPercent is only passed in for recommended events.
    // Tiered emoji: >=80% = 🔥, >=50% = ⭐, else 💡
    let matchBadgeHTML = "";

    if (typeof matchPercent === "number") {

        const emoji =
            matchPercent >= 80 ? "🔥" :
            matchPercent >= 50 ? "⭐" : "💡";

        matchBadgeHTML = `
            <span class="match-badge">
                ${emoji} ${matchPercent}% Match
            </span>
        `;

    }

    // registeredCount only comes back from the main /api/events
    // list (the Events page). Recommended/AI-matched cards don't
    // carry it, so this whole block is skipped there rather than
    // showing a misleading "0 registered".
    let capacityHTML = "";

    if (typeof event.registeredCount === "number") {

        const seatsLeft =
            Math.max(0, event.capacity - event.registeredCount);

        capacityHTML = `
            <div class="event-detail">
                <span>🎟️</span>
                <span>
                    Capacity: ${event.capacity} &nbsp;•&nbsp;
                    Registered: ${event.registeredCount} &nbsp;•&nbsp;
                    Seats left: ${seatsLeft}
                </span>
            </div>
        `;

    } else {

        // Fallback for cards that don't have a live count
        capacityHTML = `
            <div class="event-detail">
                <span>👥</span>
                <span>Capacity: ${event.capacity}</span>
            </div>
        `;

    }

    const fullBadgeHTML =
        event.status === "full"
            ? `<span class="event-full-badge">🔴 EVENT FULL</span>`
            : "";

    eventCard.innerHTML = `

        <div class="event-card-top">

            <span class="event-category">
                ${event.category}
            </span>

            ${fullBadgeHTML}

            ${matchBadgeHTML}

        </div>


        <div class="event-card-body">

            <h3>${event.title}</h3>

            ${matchReason ? `<p class="match-reason">💬 ${matchReason}</p>` : ""}

            <p class="event-description">
                ${event.description}
            </p>


            <div class="event-details">

                <div class="event-detail">
                    <span>📍</span>
                    <span>${event.venue}</span>
                </div>


                <div class="event-detail">
                    <span>📅</span>
                    <span>
                        ${new Date(event.date).toLocaleString()}
                    </span>
                </div>


                ${capacityHTML}

            </div>

            ${actionButtonHTML}

        </div>

    `;

    // Wire up whichever button was rendered
    const registerButton =
        eventCard.querySelector(".event-register-btn");

    if (registerButton) {

        registerButton.addEventListener("click", function () {

            const eventId = this.dataset.eventId;

            registerForEvent(eventId);

        });

    }


    const deleteButton =
        eventCard.querySelector(".delete-event-btn");

    if (deleteButton) {

        deleteButton.addEventListener("click", function () {

            const eventId = this.dataset.eventId;

            deleteEvent(eventId);

        });

    }


    const messageButton =
        eventCard.querySelector(".message-attendees-btn");

    if (messageButton) {

        messageButton.addEventListener("click", function () {

            const eventId = this.dataset.eventId;

            messageAttendees(eventId);

        });

    }

    return eventCard;

}


// ==========================================
// 11. LOAD EVENTS FROM BACKEND
//     (Register button for students,
//      Delete button for hosts)
// ==========================================


async function loadEvents() {

    try {

        const response = await fetch(
            "http://localhost:5000/api/events"
        );

        const events = await response.json();

        console.log("Events from backend:", events);

        const eventContainer =
            document.getElementById("allEvents");

        if (!eventContainer) {
            console.log("allEvents container not found");
            return;
        }

        const currentUser = getCurrentUser();
        const isHost = currentUser && currentUser.role === "host";

        // Remove old events
        eventContainer.innerHTML = "";

        // Create event cards
        events.forEach(event => {

            const eventCard =
                createEventCard(event, currentUser, isHost);

            eventContainer.appendChild(eventCard);

        });

        // Refresh recommendations too, since they're
        // drawn from the same event list
        loadRecommendedEvents();

    } catch (error) {

        console.error(
            "Error loading events:",
            error
        );

    }

}



// Load events when website opens
loadEvents();


// ==========================================
// REAL-TIME: NEW EVENT BROADCAST (Socket.IO)
// ==========================================
//
// index.html loads the Socket.IO client library via
// <script src="/socket.io/socket.io.js">, which gives us
// the global `io()` function here. When any host publishes
// a new event, the backend broadcasts it instantly to every
// connected browser — no need to wait for a poll or refresh.

if (typeof io === "function") {

    const socket = io();

    socket.on("connect", () => {
        console.log("Connected to real-time server:", socket.id);
    });

    socket.on("newEvent", (data) => {

        console.log("Real-time: new event published", data);

        showToast(`🔔 New event: ${data.title}`);

        // Refresh the events list so it appears immediately
        loadEvents();

    });

    socket.on("eventStarted", (data) => {

        console.log("Real-time: event started", data);

        showToast(`🎉 "${data.title}" has started!`);

    });

    socket.on("eventEnded", (data) => {

        console.log("Real-time: event ended", data);

        showToast(`🏁 "${data.title}" has ended.`);

    });

    socket.on("connect_error", (error) => {
        console.warn("Socket connection failed:", error.message);
    });

} else {

    console.warn(
        "Socket.IO client not loaded — real-time updates disabled."
    );

}


// ==========================================
// PULSE CALENDAR
// ==========================================
//
// Two views working together:
//   1. "This week" strip — always shows the real current week,
//      with small colored dots per event category and glows
//      today.
//   2. Month grid — browsable via prev/next. Each day's
//      background tints toward whichever category is happening
//      that day, and gets stronger + a count badge the more
//      events land on it. Today gently pulses.
// Clicking any day (in either view) lists that day's events in
// the side panel, color-coded to match.

let calendarViewDate = new Date(); // which month the grid shows
let calendarSelectedDateKey = null; // "YYYY-M-D" of the clicked day
let calendarEventsCache = [];

// Matches the category options on your event-creation form.
// Add an entry here if you add a new category there.
const calendarCategoryColors = {
    "Hackathon": "#D85A30",
    "Workshop": "#1D9E75",
    "Cultural": "#D4537E",
    "Sports": "#378ADD",
    "Career": "#7F77DD"
};

function calendarColorFor(category) {
    return calendarCategoryColors[category] || "#7b8297";
}

function dateKey(date) {

    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

}


function calendarEventsOnDate(date) {

    return calendarEventsCache.filter(event => {

        const eventDate = new Date(event.date);

        return (
            eventDate.getFullYear() === date.getFullYear() &&
            eventDate.getMonth() === date.getMonth() &&
            eventDate.getDate() === date.getDate()
        );

    });

}


async function loadCalendarEvents() {

    try {

        const response = await fetch("http://localhost:5000/api/events");

        calendarEventsCache = await response.json();

    } catch (error) {

        console.error("Error loading events for calendar:", error);

        calendarEventsCache = [];

    }

}


function renderCalendarWeekStrip() {

    const strip = document.getElementById("calendarWeekStrip");

    if (!strip) return;

    const today = new Date();

    // Monday of the current real-world week, regardless of
    // which month the grid below is browsing.
    const mondayOffset = (today.getDay() + 6) % 7;

    const monday = new Date(today);

    monday.setDate(today.getDate() - mondayOffset);

    strip.innerHTML = "";

    for (let i = 0; i < 7; i++) {

        const day = new Date(monday);

        day.setDate(monday.getDate() + i);

        const dayEvents = calendarEventsOnDate(day);

        const categories = [
            ...new Set(dayEvents.map(event => event.category))
        ];

        const isToday = day.toDateString() === today.toDateString();

        const isSelected = dateKey(day) === calendarSelectedDateKey;

        const card = document.createElement("div");

        card.className = "calendar-week-card";

        if (isToday) card.classList.add("today");
        if (isSelected) card.classList.add("selected");

        const dotsHTML = categories
            .slice(0, 5)
            .map(cat => `<span style="background:${calendarColorFor(cat)};"></span>`)
            .join("");

        card.innerHTML = `
            <p class="calendar-week-daylabel">
                ${day.toLocaleDateString(undefined, { weekday: "short" })}
            </p>
            <p class="calendar-week-num">${day.getDate()}</p>
            <div class="calendar-week-dots">${dotsHTML}</div>
        `;

        card.addEventListener("click", () => {

            calendarSelectedDateKey = dateKey(day);

            // If this day belongs to a different month than the
            // grid is currently showing, jump the grid there too.
            if (
                day.getMonth() !== calendarViewDate.getMonth() ||
                day.getFullYear() !== calendarViewDate.getFullYear()
            ) {

                calendarViewDate = new Date(day);

            }

            renderCalendarWeekStrip();

            renderCalendarGrid();

            showCalendarDayEvents(day, dayEvents);

        });

        strip.appendChild(card);

    }

}


function renderCalendarGrid() {

    const grid = document.getElementById("calendarGrid");

    const monthLabel = document.getElementById("calendarMonthLabel");

    if (!grid || !monthLabel) return;

    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth(); // 0-11

    monthLabel.innerText =
        calendarViewDate.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric"
        });

    // Group this month's events by day-of-month so we don't
    // re-scan the whole event list for every single day cell.
    const eventsByDay = {};

    calendarEventsCache.forEach(event => {

        const eventDate = new Date(event.date);

        if (
            eventDate.getFullYear() === year &&
            eventDate.getMonth() === month
        ) {

            const day = eventDate.getDate();

            if (!eventsByDay[day]) eventsByDay[day] = [];

            eventsByDay[day].push(event);

        }

    });

    // JS getDay(): 0=Sunday..6=Saturday. Our grid starts on
    // Monday, so shift it to 0=Monday..6=Sunday.
    const firstOfMonth = new Date(year, month, 1);

    const firstWeekday = (firstOfMonth.getDay() + 6) % 7;

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();

    grid.innerHTML = "";

    // Empty leading cells so day 1 lands on the right weekday
    for (let i = 0; i < firstWeekday; i++) {

        const emptyCell = document.createElement("div");

        emptyCell.className = "calendar-day empty";

        grid.appendChild(emptyCell);

    }

    for (let day = 1; day <= daysInMonth; day++) {

        const cellDate = new Date(year, month, day);

        const cell = document.createElement("div");

        cell.className = "calendar-day";

        cell.style.position = "relative";

        const isToday =
            cellDate.toDateString() === today.toDateString();

        if (isToday) {
            cell.classList.add("today");
            cell.classList.add("pulse-today");
        }

        if (dateKey(cellDate) === calendarSelectedDateKey) {
            cell.classList.add("selected");
        }

        cell.innerText = day;

        const dayEvents = eventsByDay[day] || [];

        if (dayEvents.length > 0) {

            // Tint toward the day's first category — stronger,
            // more saturated the more events land on that day,
            // so busier days visibly "glow" brighter, not just
            // a faint highlight.
            const color = calendarColorFor(dayEvents[0].category);

            const alpha = dayEvents.length >= 3 ? "e6" :
                          dayEvents.length === 2 ? "b3" : "40";

            cell.style.background = color + alpha;

            cell.dataset.intensity =
                dayEvents.length >= 3 ? "3" :
                dayEvents.length === 2 ? "2" : "1";

            if (dayEvents.length >= 2) {

                const badge = document.createElement("span");

                badge.className = "calendar-count-badge";

                badge.style.color = color;

                badge.innerText = dayEvents.length;

                cell.appendChild(badge);

            }

        }

        cell.addEventListener("click", () => {

            calendarSelectedDateKey = dateKey(cellDate);

            renderCalendarGrid(); // redraw so "selected" highlight updates

            renderCalendarWeekStrip(); // keep week strip's selection in sync

            showCalendarDayEvents(cellDate, dayEvents);

        });

        grid.appendChild(cell);

    }

}


function showCalendarDayEvents(date, events) {

    const titleEl = document.getElementById("calendarSelectedDate");

    const listEl = document.getElementById("calendarDayEvents");

    if (!titleEl || !listEl) return;

    titleEl.innerText = date.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long"
    });

    if (events.length === 0) {

        listEl.innerHTML = `
            <div class="skills-empty">
                <span>🗓️</span>
                <p>No events on this day.</p>
            </div>
        `;

        return;

    }

    listEl.innerHTML = events.map(event => `
        <div class="calendar-day-event-item">
            <span class="dot" style="background:${calendarColorFor(event.category)};"></span>
            <div>
                <strong>${event.title}</strong>
                <small>
                    ${event.category} • 📍 ${event.venue} •
                    ${new Date(event.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </small>
            </div>
        </div>
    `).join("");

}


async function openCalendarPage() {

    calendarViewDate = new Date(); // always open on the current month

    calendarSelectedDateKey = null;

    await loadCalendarEvents();

    renderCalendarWeekStrip();

    renderCalendarGrid();

    // Reset the side panel to its default state
    const titleEl = document.getElementById("calendarSelectedDate");

    const listEl = document.getElementById("calendarDayEvents");

    if (titleEl) titleEl.innerText = "Select a date";

    if (listEl) {

        listEl.innerHTML = `
            <div class="skills-empty">
                <span>🗓️</span>
                <p>Click any date to see what's on.</p>
            </div>
        `;

    }

}


// Open (and refresh) the calendar every time its nav button
// is clicked, so newly created events always show up
document.querySelectorAll('[data-page="calendar"]').forEach(button => {

    button.addEventListener("click", openCalendarPage);

});


const calendarPrevBtn = document.getElementById("calendarPrevBtn");

const calendarNextBtn = document.getElementById("calendarNextBtn");

if (calendarPrevBtn) {

    calendarPrevBtn.addEventListener("click", () => {

        calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);

        calendarSelectedDateKey = null;

        renderCalendarGrid();

    });

}

if (calendarNextBtn) {

    calendarNextBtn.addEventListener("click", () => {

        calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);

        calendarSelectedDateKey = null;

        renderCalendarGrid();

    });

}



// ==========================================
// RECOMMENDED EVENTS (based on My Skills)
//     Fills both:
//     - "Recommended For You" on Home
//     - "Made For You" on Recommendations page
// ==========================================

async function loadRecommendedEvents() {

    const homeContainer =
        document.getElementById("recommendedEvents");

    const recommendationsContainer =
        document.getElementById("recommendations");

    // Nothing to fill in on this page load
    if (!homeContainer && !recommendationsContainer) {
        return;
    }

    const currentUser = getCurrentUser();

    const noSkillsMessage = `
        <div class="skills-empty" style="grid-column: 1 / -1;">
            <span>🎯</span>
            <p>
                Add some skills on your Profile page and
                we'll recommend events that match them.
            </p>
        </div>
    `;

    if (!currentUser) {

        if (homeContainer) homeContainer.innerHTML = "";
        if (recommendationsContainer) recommendationsContainer.innerHTML = "";

        return;

    }

    const skills = currentUser.skills || [];

    if (skills.length === 0) {

        if (homeContainer) homeContainer.innerHTML = noSkillsMessage;
        if (recommendationsContainer) recommendationsContainer.innerHTML = noSkillsMessage;

        return;

    }

    const isHost = currentUser.role === "host";

    const emptyMatchMessage = `
        <div class="skills-empty" style="grid-column: 1 / -1;">
            <span>🔍</span>
            <p>
                No events match your skills yet.
                Check back later or browse all events.
            </p>
        </div>
    `;

    function renderScoredEvents(scoredEvents) {

        if (homeContainer) {

            homeContainer.innerHTML = "";

            if (scoredEvents.length === 0) {

                homeContainer.innerHTML = emptyMatchMessage;

            } else {

                scoredEvents.slice(0, 3).forEach(item => {

                    homeContainer.appendChild(
                        createEventCard(
                            item.event,
                            currentUser,
                            isHost,
                            item.score,
                            item.reason
                        )
                    );

                });

            }

        }

        if (recommendationsContainer) {

            recommendationsContainer.innerHTML = "";

            if (scoredEvents.length === 0) {

                recommendationsContainer.innerHTML = emptyMatchMessage;

            } else {

                scoredEvents.forEach(item => {

                    recommendationsContainer.appendChild(
                        createEventCard(
                            item.event,
                            currentUser,
                            isHost,
                            item.score,
                            item.reason
                        )
                    );

                });

            }

        }

    }


    // ==========================================
    // 1. TRY THE AI-POWERED ENDPOINT FIRST
    // ==========================================

    try {

        const aiResponse = await fetch(
            `http://localhost:5000/api/ai-recommendations/${currentUser._id}`
        );

        if (!aiResponse.ok) {
            throw new Error("AI recommendation endpoint returned an error");
        }

        const aiResults = await aiResponse.json();

        console.log(
            "AI recommendation results:",
            aiResults.map(item => `${item.event.title} (${item.score}%) — ${item.reason}`)
        );

        renderScoredEvents(aiResults);

        return; // success — no need to fall back

    } catch (aiError) {

        console.warn(
            "AI recommendations unavailable, falling back to keyword matching:",
            aiError.message
        );

    }


    // ==========================================
    // 2. FALLBACK: client-side keyword matching
    //    (runs if the AI call above failed —
    //    missing API key, rate limit, network issue, etc.)
    // ==========================================

    try {

        const response = await fetch(
            "http://localhost:5000/api/events"
        );

        const events = await response.json();

        // For each event, we check how many of the
        // student's skills relate to it, and produce a
        // 0–100% score:
        //   - a skill found as a full phrase in the
        //     event's title/description/category counts
        //     as a full match (weight 1)
        //   - a skill found only as a partial word match
        //     counts as a partial match (weight 0.6)
        function getMatchScore(event) {

            const haystack = `
                ${event.title}
                ${event.description}
                ${event.category}
            `.toLowerCase();

            let totalWeight = 0;

            skills.forEach(skill => {

                const skillLower = skill.toLowerCase().trim();

                if (!skillLower) return;

                if (haystack.includes(skillLower)) {

                    totalWeight += 1; // full phrase match
                    return;

                }

                const words = skillLower
                    .split(/[\s,/-]+/)
                    .filter(word => word.length > 2);

                const hasPartialMatch =
                    words.some(word => haystack.includes(word));

                if (hasPartialMatch) {
                    totalWeight += 0.6; // partial word match
                }

            });

            if (skills.length === 0) return 0;

            const rawScore = (totalWeight / skills.length) * 100;

            return Math.min(100, Math.round(rawScore));

        }

        const scoredEvents = events
            .map(event => ({
                event,
                score: getMatchScore(event)
            }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score);

        console.log(
            "Fallback keyword matching — your skills:",
            skills,
            "| total events:",
            events.length,
            "| matched:",
            scoredEvents.length
        );

        renderScoredEvents(scoredEvents);

    } catch (error) {

        console.error("Error loading recommended events:", error);

    }

}

// Note: loadRecommendedEvents() is also called automatically
// at the end of loadEvents() above, so recommendations stay
// in sync whenever the event list refreshes.


// ==========================================
// LOAD "MY REGISTRATIONS" (student only)
// ==========================================

async function loadMyRegistrations() {

    const currentUser = getCurrentUser();

    const container =
        document.getElementById("myRegistrations");

    const statCount =
        document.getElementById("registrationCount");

    if (!container) {
        return;
    }

    if (!currentUser) {
        container.innerHTML =
            "<p style='color:#7b8297;'>Login to see your registrations.</p>";
        return;
    }

    try {

        const response = await authFetch(
            `http://localhost:5000/api/registrations/user/${currentUser._id}`
        );

        const allRegistrations = await response.json();

        console.log("My registrations:", allRegistrations);

        // Only keep registrations for events that haven't
        // happened yet. Checking the event's own `date` directly
        // (rather than only trusting the backend's `status`
        // field) means this updates instantly — it doesn't have
        // to wait for the server's once-a-minute background job
        // to flip the event to "completed" first.
        const now = new Date();

        const registrations = allRegistrations.filter(reg => {

            const event = reg.eventId;

            if (!event) return false;

            const isPastDate = new Date(event.date) < now;

            const isCompletedOrCancelled =
                event.status === "completed" || event.status === "cancelled";

            return !isPastDate && !isCompletedOrCancelled;

        });

        // Update the "My Registrations" stat card on Home
        if (statCount) {
            statCount.innerText = registrations.length;
        }

        // Update the matching stat on the Profile page
        const profileRegCount =
            document.getElementById("profileRegCount");

        if (profileRegCount) {
            profileRegCount.innerText = registrations.length;
        }

        container.innerHTML = "";

        if (registrations.length === 0) {

            container.innerHTML =
                "<p style='color:#7b8297;'>You haven't registered for any upcoming events.</p>";

            return;
        }

        registrations.forEach(reg => {

            // eventId is populated on the backend, so it's
            // the full event object here, not just an ID.
            const event = reg.eventId;

            if (!event) {
                return;
            }

            const card = document.createElement("div");

            card.className = "event-card";

            card.innerHTML = `

                <div class="event-card-top">

                    <span class="event-category">
                        ${event.category}
                    </span>

                </div>


                <div class="event-card-body">

                    <h3>${event.title}</h3>

                    <p class="event-description">
                        ${event.description}
                    </p>


                    <div class="event-details">

                        <div class="event-detail">
                            <span>📍</span>
                            <span>${event.venue}</span>
                        </div>


                        <div class="event-detail">
                            <span>📅</span>
                            <span>
                                ${new Date(event.date).toLocaleString()}
                            </span>
                        </div>


                        <div class="event-detail">
                            <span>✅</span>
                            <span>Status: ${reg.status}</span>
                        </div>

                    </div>


                    ${
                        (event.status === "completed" || event.status === "cancelled")
                            ? `<span class="event-full-badge" style="background:#eee; color:#7b8297;">
                                   ${event.status === "completed" ? "✅ Event completed" : "🚫 Event cancelled by host"}
                               </span>`
                            : `<button
                                    class="register-btn cancel-registration-btn"
                                    data-registration-id="${reg._id}"
                                    style="background:#e34267;"
                               >
                                    Cancel Registration
                               </button>`
                    }

                </div>

            `;

            container.appendChild(card);

            const cancelBtn =
                card.querySelector(".cancel-registration-btn");

            if (cancelBtn) {

                cancelBtn.addEventListener("click", function () {

                    const registrationId = this.dataset.registrationId;

                    cancelRegistration(registrationId);

                });

            }

        });

    } catch (error) {

        console.error("Error loading my registrations:", error);

    }

}

// Load on page open (in case user is already logged in
// from a previous session)
loadMyRegistrations();


// ==========================================
// CANCEL REGISTRATION (student only)
// ==========================================

async function cancelRegistration(registrationId) {

    const confirmCancel = confirm(
        "Are you sure you want to cancel this registration?"
    );

    if (!confirmCancel) {
        return;
    }

    try {

        const response = await authFetch(
            `http://localhost:5000/api/registrations/${registrationId}`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (response.ok) {

            showToast("Registration cancelled");

            // Refresh the list and stat count
            loadMyRegistrations();

        } else {

            alert(data.message || "Failed to cancel registration");

        }

    } catch (error) {

        console.error("Cancel registration error:", error);

        alert("Could not connect to backend.");

    }

}

// ==========================================
// 11. EVENTS THIS MONTH COUNT
// ==========================================

async function updateEventsThisMonth() {

    try {

        const response = await fetch("http://localhost:5000/api/events");

        const events = await response.json();

        const today = new Date();

        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const eventsThisMonth = events.filter(event => {

            const eventDate = new Date(event.date);

            return (
                eventDate.getMonth() === currentMonth &&
                eventDate.getFullYear() === currentYear
            );

        });

        const countElement =
            document.getElementById("eventCount");

        if (countElement) {

            countElement.innerText =
                eventsThisMonth.length;

        }

    } catch (error) {

        console.error(
            "Error counting monthly events:",
            error
        );

    }

}

updateEventsThisMonth();


// ==========================================
// LOGIN / SIGNUP
// ==========================================

const authScreen = document.getElementById("authScreen");

const loginBox = document.getElementById("loginBox");
const signupBox = document.getElementById("signupBox");

const showSignup = document.getElementById("showSignup");
const showLogin = document.getElementById("showLogin");


// ==========================================
// SHOW SIGNUP
// ==========================================

showSignup.addEventListener("click", function () {

    loginBox.style.display = "none";

    signupBox.style.display = "block";

});


// ==========================================
// SHOW LOGIN
// ==========================================

showLogin.addEventListener("click", function () {

    signupBox.style.display = "none";

    loginBox.style.display = "block";

});


// ==========================================
// SIGNUP
// ==========================================

const signupForm =
    document.getElementById("signupForm");


signupForm.addEventListener("submit", async function (e) {

    e.preventDefault();


    const name =
        document.getElementById("signupName").value;

    const email =
        document.getElementById("signupEmail").value;

    const password =
        document.getElementById("signupPassword").value;

    const college =
        document.getElementById("signupCollege").value;

    const course =
        document.getElementById("signupCourse").value;


    const selectedRole =
        document.querySelector(
            'input[name="role"]:checked'
        ).value;


    const userData = {

        name: name,

        email: email,

        password: password,

        college: college,

        course: course,

        role: selectedRole

    };


    console.log("Signup data:", userData);


    try {

        const response = await fetch(
            "http://localhost:5000/api/users/signup",
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(userData)

            }
        );


        const data = await response.json();


        console.log(
            "Signup response:",
            data
        );


        if (response.ok) {

            alert(
                data.user && data.user.hostRequestStatus === "pending"
                    ? "Account created as a student! 🎉\n\nYour request for Host access was sent to an administrator. You will get a notification when it is approved."
                    : "Account created successfully! 🎉"
            );


            // Save logged-in user + auth token
            localStorage.setItem(
                "campusUser",
                JSON.stringify(data.user)
            );

            localStorage.setItem("campusToken", data.token);


            // Hide login/signup
            authScreen.style.display = "none";


            // Update dashboard
            showUserDashboard(data.user);

            // Apply host/student permissions
            applyRolePermissions();

            // Refresh events so buttons match the new role
            loadEvents();

            // Load this user's existing registrations (none yet, but keeps things consistent)
            loadMyRegistrations();

            // Refresh Find Teammates so it reflects this account
            loadTeamRequests();

            // Refresh notifications for this account
            loadNotifications();

        } else {

            alert(
                data.message ||
                "Signup failed"
            );

        }

    } catch (error) {

        console.error(
            "Signup error:",
            error
        );

        alert(
            "Could not connect to backend"
        );

    }

});


// ==========================================
// SHOW USER DASHBOARD
// ==========================================

// What to show as the person's role. A student whose host request is
// still waiting for an admin sees that, so they know it was received.
function roleText(user) {

    if (user.role === "admin") return "Admin";

    if (user.role === "host") return "Host";

    if (user.hostRequestStatus === "pending") return "Student • Host request pending";

    if (user.hostRequestStatus === "rejected") return "Student • Host request declined";

    return "Student";

}

function showUserDashboard(user) {

    const username =
        document.getElementById("username");

    const heroName =
        document.getElementById("heroName");

    const avatar =
        document.getElementById("avatar");

    const profileName =
        document.getElementById("profileName");

    const profileEmail =
        document.getElementById("profileEmail");

    const roleLabel =
        document.querySelector(".profile-mini small");

    const profileRole =
        document.getElementById("profileRole");

    const profileAvatar =
        document.getElementById("profileAvatar");

    const profileCollegeCourse =
        document.getElementById("profileCollegeCourse");

    const profileCollege =
        document.getElementById("profileCollege");

    const profileCourse =
        document.getElementById("profileCourse");

    const profileJoined =
        document.getElementById("profileJoined");

    const skillsContainer =
        document.getElementById("skills");


    if (username) {
        username.innerText = user.name;
    }

    if (heroName) {
        heroName.innerText = user.name;
    }

    if (avatar) {
        avatar.innerText =
            user.name.charAt(0).toUpperCase();
    }

    if (profileName) {
        profileName.innerText = user.name;
    }

    if (profileEmail) {
        profileEmail.innerText = user.email;
    }

    if (roleLabel) {
        roleLabel.innerText =
            roleText(user);
    }

    const roleDisplay =
        roleText(user);

    if (profileRole) {
        profileRole.innerText = roleDisplay;
    }

    if (profileAvatar) {
        profileAvatar.innerText =
            user.name.charAt(0).toUpperCase();
    }

    if (profileCollegeCourse) {
        profileCollegeCourse.innerText =
            user.course
                ? `${user.college} • ${user.course}`
                : user.college || "";
    }

    if (profileCollege) {
        profileCollege.innerText = user.college || "—";
    }

    if (profileCourse) {
        profileCourse.innerText = user.course || "—";
    }

    if (profileJoined && user.createdAt) {
        profileJoined.innerText =
            new Date(user.createdAt).toLocaleDateString(
                undefined,
                { year: "numeric", month: "long" }
            );
    }

    if (skillsContainer) {

        skillsContainer.innerHTML = "";
        const skills = user.skills || [];

        if (skills.length === 0) {

            skillsContainer.innerHTML = `
                <div class="skills-empty">
                    <span>🎯</span>
                    <p>No skills added yet.</p>
                </div>
            `;

        } else {

            skills.forEach(skill => {

                const chip = document.createElement("span");

                chip.className = "chip";

                chip.innerText = skill;

                skillsContainer.appendChild(chip);

            });

        }

    }

    const aiExplainerSkills =
        document.getElementById("aiExplainerSkills");

    if (aiExplainerSkills) {

        const skills = user.skills || [];

        aiExplainerSkills.innerText =
            skills.length > 0
                ? skills.join(", ")
                : "Add skills on your Profile";

    }


    // Go to Home
    showPage("home");

}

// ==========================================
// ROLE BASED ACCESS
// ==========================================

function applyRolePermissions() {

    const user = getCurrentUser();

    const hostItems =
        document.querySelectorAll(".host-only");

    if (!user) {
        return;
    }

    hostItems.forEach(item => {

        if (user.role === "host") {

            // Host can see Create Event
            item.style.display = "";

        } else {

            // Student cannot see Create Event
            item.style.display = "none";

        }

    });

    if (user.role === "admin") {

        injectAdminUI();

        loadAdminData();

    } else {

        removeAdminUI();

    }

}

// Apply permissions when page loads
applyRolePermissions();

// ==========================================
// LOGIN
// ==========================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        const email =
            document.getElementById("loginEmail").value.trim();

        const password =
            document.getElementById("loginPassword").value;

        try {

            const response = await fetch(
                "http://localhost:5000/api/users/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                }
            );

            const data = await response.json();

            console.log("Login response:", data);

            if (response.ok) {

                // Save logged-in user + auth token
                localStorage.setItem(
                    "campusUser",
                    JSON.stringify(data.user)
                );

                localStorage.setItem("campusToken", data.token);

                alert("Login successful! 🎉");

                // Hide login/signup screen
                const authScreen =
                    document.getElementById("authScreen");

                if (authScreen) {
                    authScreen.style.display = "none";
                }

                // Show user's name on dashboard
                showUserDashboard(data.user);

                // Apply host/student permissions
                applyRolePermissions();

                // Refresh events so buttons match the logged-in role
                loadEvents();

                // Load this user's existing registrations
                loadMyRegistrations();

                // Refresh Find Teammates so it reflects this account
                loadTeamRequests();

                // Refresh notifications for this account
                loadNotifications();

            } else {

                alert(
                    data.message || "Invalid email or password"
                );

            }

        } catch (error) {

            console.error("Login error:", error);

            alert("Could not connect to backend");

        }

    });

}

// ==========================================
// DELETE EVENT (HOST ONLY)
// ==========================================

async function deleteEvent(eventId) {

    const currentUser = getCurrentUser();

    if (!currentUser) {
        alert("Please login first");
        return;
    }

    if (currentUser.role !== "host") {
        alert("Only hosts can delete events.");
        return;
    }

    const confirmDelete = confirm(
        "Are you sure you want to delete this event?"
    );

    if (!confirmDelete) {
        return;
    }

    try {

        const response = await fetch(
            `http://localhost:5000/api/events/${eventId}`,
            authHeaders({
                method: "DELETE",

                headers: {
                    "Content-Type": "application/json"
                }
            })
        );

        const data = await response.json();

        if (response.ok) {

            // The backend decides whether this was a hard delete
            // or a cancellation (if students had already
            // registered) — show whichever message it actually
            // sent instead of assuming.
            showToast(data.message || "Event removed");

            loadEvents();

            updateEventsThisMonth();

        } else {

            alert(data.message);

        }

    } catch (error) {

        console.error("Delete error:", error);

        alert("Could not connect to backend.");

    }
}


// ==========================================
// MESSAGE ATTENDEES (host only, own event)
// ==========================================

async function messageAttendees(eventId) {

    const currentUser = getCurrentUser();

    if (!currentUser || currentUser.role !== "host") {
        alert("Only hosts can message attendees.");
        return;
    }

    const message = prompt(
        "Message to everyone registered for this event:"
    );

    if (!message || !message.trim()) {
        return; // cancelled or empty
    }

    try {

        const response = await authFetch(
            `http://localhost:5000/api/events/${eventId}/message`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: message.trim()
                })
            }
        );

        const data = await response.json();

        if (response.ok) {

            showToast(data.message);

        } else {

            alert(data.message);

        }

    } catch (error) {

        console.error("Message attendees error:", error);

        alert("Could not connect to backend.");

    }

}

// ==========================================
// EVENT REGISTRATION FORM (STUDENT ONLY)
// ==========================================

let selectedEventId = null;


// Open registration form
async function registerForEvent(eventId) {

    const currentUser = getCurrentUser();

    if (!currentUser) {
        alert("Please login first to register.");
        return;
    }

    if (currentUser.role === "host") {
        alert("Hosts cannot register for events.");
        return;
    }

    // Remember selected event
    window.selectedEventId = eventId;

    // Get registration popup
    const modal =
        document.getElementById("registrationModal");

    if (!modal) {
        alert("Registration form not found in HTML.");
        return;
    }

    // Fill user information
    const nameInput =
        document.getElementById("regName");

    const emailInput =
        document.getElementById("regEmail");

    if (nameInput) {
        nameInput.value = currentUser.name || "";
    }

    if (emailInput) {
        emailInput.value = currentUser.email || "";
    }

    // Show popup
    modal.style.display = "flex";
}


// ==========================================
// REGISTRATION FORM SUBMIT
// ==========================================

const registrationForm =
    document.getElementById("registrationForm");

const closeRegistrationBtn =
    document.getElementById("closeRegistration");

const registrationModal =
    document.getElementById("registrationModal");


if (closeRegistrationBtn) {

    closeRegistrationBtn.addEventListener("click", function () {

        registrationModal.style.display = "none";

    });

}


if (registrationForm) {

    registrationForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        const currentUser = getCurrentUser();

        if (!currentUser || !window.selectedEventId) {
            alert("Something went wrong. Please try again.");
            return;
        }

        const registrationData = {

            eventId: window.selectedEventId,

            name: document.getElementById("regName").value,

            branch: document.getElementById("regBranch").value,

            year: document.getElementById("regYear").value,

            email: document.getElementById("regEmail").value

        };

        try {

            const response = await authFetch(
                "http://localhost:5000/api/registrations",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(registrationData)
                }
            );

            const data = await response.json();

            if (response.ok) {

                showToast("Event registered successfully! 🎉");

                registrationModal.style.display = "none";

                registrationForm.reset();

                // Refresh so the newly registered event shows up
                // immediately in "My Registrations" and the stat card
                loadMyRegistrations();

                // Show the registration-confirmed notification right away
                loadNotifications();

            } else {

                alert(
                    data.message || "Registration failed"
                );

            }

        } catch (error) {

            console.error("Registration error:", error);

            alert("Could not connect to backend.");

        }

    });

}


// ==========================================
// EDIT PROFILE
// ==========================================

const editProfileBtn =
    document.getElementById("editProfileBtn");

const editProfileModal =
    document.getElementById("editProfileModal");

const editProfileForm =
    document.getElementById("editProfileForm");

const closeEditProfileBtn =
    document.getElementById("closeEditProfile");


if (editProfileBtn) {

    editProfileBtn.addEventListener("click", function () {

        const currentUser = getCurrentUser();

        if (!currentUser) {
            alert("Please login first.");
            return;
        }

        // Pre-fill the form with the current values
        document.getElementById("editName").value =
            currentUser.name || "";

        document.getElementById("editCollege").value =
            currentUser.college || "";

        document.getElementById("editCourse").value =
            currentUser.course || "";

        document.getElementById("editSkills").value =
            (currentUser.skills || []).join(", ");

        editProfileModal.style.display = "flex";

    });

}


if (closeEditProfileBtn) {

    closeEditProfileBtn.addEventListener("click", function () {

        editProfileModal.style.display = "none";

    });

}


if (editProfileForm) {

    editProfileForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        const currentUser = getCurrentUser();

        if (!currentUser) {
            alert("Please login first.");
            return;
        }

        const name =
            document.getElementById("editName").value.trim();

        const college =
            document.getElementById("editCollege").value.trim();

        const course =
            document.getElementById("editCourse").value.trim();

        const skillsRaw =
            document.getElementById("editSkills").value.trim();

        // Turn "Python, UI Design, Public Speaking" into
        // a clean array, dropping empty entries
        const skills = skillsRaw
            ? skillsRaw.split(",").map(s => s.trim()).filter(Boolean)
            : [];

        try {

            const response = await fetch(
                `http://localhost:5000/api/users/${currentUser._id}`,
                authHeaders({
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        name,
                        college,
                        course,
                        skills
                    })
                })
            );

            const data = await response.json();

            if (response.ok) {

                // Update localStorage so the change survives a refresh
                localStorage.setItem(
                    "campusUser",
                    JSON.stringify(data.user)
                );

                // Re-render everything that shows profile info
                showUserDashboard(data.user);

                editProfileModal.style.display = "none";

                showToast("Profile updated successfully! ✅");

                showPage("profile");

                // Skills may have changed — refresh recommendations
                // so new matches show up right away
                loadRecommendedEvents();

                // Skills may have changed — re-rank teammate matches too
                loadTeamRequests();

            } else {

                alert(data.message || "Failed to update profile");

            }

        } catch (error) {

            console.error("Update profile error:", error);

            alert("Could not connect to backend.");

        }

    });

}


// ==========================================
// NOTIFICATIONS
// ==========================================

// Tracks how many unread notifications we saw last time we
// checked, so we can tell when a NEW one has arrived and
// pop a toast for it — a lightweight stand-in for real-time
// push without needing a full websocket setup.
let lastSeenUnreadCount = 0;
let notificationsInitialized = false;


async function loadNotifications() {

    const currentUser = getCurrentUser();

    const listContainer =
        document.getElementById("notifications");

    if (!currentUser) {

        updateNotificationCount(0);

        if (listContainer) listContainer.innerHTML = "";

        return;

    }

    try {

        const response = await authFetch(
            `http://localhost:5000/api/notifications/${currentUser._id}`
        );

        const notifications = await response.json();

        const unreadCount =
            notifications.filter(n => !n.isRead).length;

        updateNotificationCount(unreadCount);

        // Pop a toast if unread count went UP since last check
        // (and skip the very first load, so you don't get a
        // toast just for logging in with old unread items)
        if (notificationsInitialized && unreadCount > lastSeenUnreadCount) {

            showToast("🔔 You have a new notification!");

        }

        notificationsInitialized = true;
        lastSeenUnreadCount = unreadCount;


        if (!listContainer) return;

        listContainer.innerHTML = "";

        if (notifications.length === 0) {

            listContainer.innerHTML = `
                <div class="skills-empty">
                    <span>🔔</span>
                    <p>No notifications yet.</p>
                </div>
            `;

            return;

        }

        notifications.forEach(notification => {

            const item = document.createElement("div");

            item.className =
                "notification" + (notification.isRead ? "" : " unread");

            const timeAgo =
                new Date(notification.createdAt).toLocaleString();

            item.innerHTML = `
                <span style="font-size:18px;">
                    ${notification.isRead ? "✅" : "🔔"}
                </span>
                <div>
                    <p style="margin:0; font-size:13px;">
                        ${notification.message}
                    </p>
                    <small style="color:var(--muted); font-size:10px;">
                        ${timeAgo}
                    </small>
                </div>
            `;

            item.addEventListener("click", function () {

                if (!notification.isRead) {
                    markNotificationRead(notification._id);
                }

            });

            listContainer.appendChild(item);

        });

    } catch (error) {

        console.error("Error loading notifications:", error);

    }

}


async function markNotificationRead(notificationId) {

    try {

        await authFetch(
            `http://localhost:5000/api/notifications/${notificationId}/read`,
            { method: "PUT" }
        );

        loadNotifications();

    } catch (error) {

        console.error("Mark notification read error:", error);

    }

}


// Load on page open (in case already logged in) and then
// poll periodically so unread counts / new notifications
// show up without a manual refresh.
loadNotifications();

setInterval(loadNotifications, 20000); // every 20 seconds


// ==========================================
// FIND TEAMMATES
// ==========================================

// --- Open/close the Post Request modal ---

const postTeamRequestBtn =
    document.getElementById("postTeamRequestBtn");

const teamRequestModal =
    document.getElementById("teamRequestModal");

const teamRequestForm =
    document.getElementById("teamRequestForm");

const closeTeamRequestBtn =
    document.getElementById("closeTeamRequest");


if (postTeamRequestBtn) {

    postTeamRequestBtn.addEventListener("click", function () {

        const currentUser = getCurrentUser();

        if (!currentUser) {
            alert("Please login first.");
            return;
        }

        teamRequestModal.style.display = "flex";

    });

}


if (closeTeamRequestBtn) {

    closeTeamRequestBtn.addEventListener("click", function () {

        teamRequestModal.style.display = "none";

    });

}


// --- Submit a new request ---

if (teamRequestForm) {

    teamRequestForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        const currentUser = getCurrentUser();

        if (!currentUser) {
            alert("Please login first.");
            return;
        }

        const projectTitle =
            document.getElementById("teamProjectTitle").value.trim();

        const description =
            document.getElementById("teamDescription").value.trim();

        const skillsRaw =
            document.getElementById("teamSkillsNeeded").value.trim();

        const skillsNeeded = skillsRaw
            ? skillsRaw.split(",").map(s => s.trim()).filter(Boolean)
            : [];

        try {

            const response = await fetch(
                "http://localhost:5000/api/teams",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: currentUser._id,
                        projectTitle,
                        description,
                        skillsNeeded
                    })
                }
            );

            const data = await response.json();

            if (response.ok) {

                showToast("Teammate request posted! 🤝");

                teamRequestModal.style.display = "none";

                teamRequestForm.reset();

                loadTeamRequests();

            } else {

                alert(data.message || "Failed to post request");

            }

        } catch (error) {

            console.error("Post team request error:", error);

            alert("Could not connect to backend.");

        }

    });

}


// --- Render one team request card ---

function createTeamRequestCard(request, currentUser, matchPercent, matchReason) {

    const poster = request.userId; // populated by backend

    const card = document.createElement("div");

    card.className = "team-card";

    const isOwner =
        currentUser &&
        poster &&
        poster._id === currentUser._id;

    const skillsHTML = (request.skillsNeeded || [])
        .map(skill => `<span class="team-skill-chip">${skill}</span>`)
        .join("");

    let matchBadgeHTML = "";

    if (typeof matchPercent === "number") {

        const emoji =
            matchPercent >= 80 ? "🔥" :
            matchPercent >= 50 ? "⭐" : "💡";

        matchBadgeHTML = `
            <span class="match-badge">
                ${emoji} ${matchPercent}% Match
            </span>
        `;

    }

    // --- Footer content differs for owner vs everyone else ---

    let footerHTML = "";

    if (isOwner) {

        const interested = request.interestedUsers || [];

        const interestedListHTML = interested.length === 0
            ? `<p style="color:var(--muted); font-size:11.5px; margin-top:8px;">No one has requested to join yet.</p>`
            : `
                <div class="interested-list">
                    ${interested.map(entry => `
                        <div class="interested-chip">
                            <div class="interested-avatar">
                                ${entry.userId ? entry.userId.name.charAt(0).toUpperCase() : "?"}
                            </div>
                            <div>
                                <strong>${entry.userId ? entry.userId.name : "Unknown"}</strong>
                                ${entry.message ? `<small>"${entry.message}"</small>` : ""}
                            </div>
                        </div>
                    `).join("")}
                </div>
            `;

        footerHTML = `
            <div class="team-card-footer" style="flex-direction:column; align-items:stretch;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="font-size:11.5px;">
                        🙋 ${interested.length} interested
                    </strong>
                    <button class="team-delete-btn" data-request-id="${request._id}">
                        Delete My Request
                    </button>
                </div>
                ${interestedListHTML}
            </div>
        `;

    } else {

        const alreadyRequested =
            currentUser &&
            (request.interestedUsers || []).some(
                entry => entry.userId && entry.userId._id === currentUser._id
            );

        footerHTML = `
            <div class="team-card-footer">
                <button
                    class="register-btn team-join-btn"
                    data-request-id="${request._id}"
                    ${alreadyRequested ? "disabled style=\"background:#21b573;cursor:default;\"" : ""}
                >
                    ${alreadyRequested ? "Requested ✓" : "Request to Join"}
                </button>
            </div>
        `;

    }

    card.innerHTML = `

        <div class="team-header">

            <div class="team-avatar">
                ${poster ? poster.name.charAt(0).toUpperCase() : "?"}
            </div>

            <div>
                <strong>${poster ? poster.name : "Unknown student"}</strong><br>
                <small style="color:var(--muted); font-size:10px;">
                    ${poster && poster.college ? poster.college : ""}
                </small>
            </div>

            ${matchBadgeHTML}

        </div>

        <div class="team-card-title">${request.projectTitle}</div>

        ${matchReason ? `<p class="match-reason">💬 ${matchReason}</p>` : ""}

        <p class="team-card-desc">${request.description}</p>

        ${skillsHTML ? `<div class="team-card-skills">${skillsHTML}</div>` : ""}

        ${footerHTML}

    `;

    const deleteBtn = card.querySelector(".team-delete-btn");

    if (deleteBtn) {

        deleteBtn.addEventListener("click", function () {

            deleteTeamRequest(this.dataset.requestId);

        });

    }

    const joinBtn = card.querySelector(".team-join-btn");

    if (joinBtn) {

        joinBtn.addEventListener("click", function () {

            requestToJoinTeam(this.dataset.requestId);

        });

    }

    return card;

}


// --- Request to join a specific team ---

async function requestToJoinTeam(requestId) {

    const currentUser = getCurrentUser();

    if (!currentUser) {
        alert("Please login first.");
        return;
    }

    try {

        const response = await fetch(
            `http://localhost:5000/api/teams/${requestId}/interest`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: currentUser._id })
            }
        );

        const data = await response.json();

        if (response.ok) {

            showToast("Request sent! 🙋");

            loadTeamRequests();

        } else {

            alert(data.message);

        }

    } catch (error) {

        console.error("Request to join error:", error);

        alert("Could not connect to backend.");

    }

}


// --- Delete own request ---

async function deleteTeamRequest(requestId) {

    const currentUser = getCurrentUser();

    const confirmDelete = confirm("Delete this teammate request?");

    if (!confirmDelete) return;

    try {

        const response = await fetch(
            `http://localhost:5000/api/teams/${requestId}`,
            {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: currentUser._id })
            }
        );

        const data = await response.json();

        if (response.ok) {

            showToast("Request deleted");

            loadTeamRequests();

        } else {

            alert(data.message);

        }

    } catch (error) {

        console.error("Delete team request error:", error);

        alert("Could not connect to backend.");

    }

}


// --- Load and render all requests, with AI matching ---

async function loadTeamRequests() {

    const container = document.getElementById("teams");

    const explainerSkills =
        document.getElementById("teamExplainerSkills");

    if (!container) return;

    const currentUser = getCurrentUser();

    if (explainerSkills) {

        const mySkills = (currentUser && currentUser.skills) || [];

        explainerSkills.innerText =
            mySkills.length > 0
                ? mySkills.join(", ")
                : "Add skills on your Profile";

    }

    if (!currentUser) {

        container.innerHTML = `
            <div class="skills-empty" style="grid-column: 1 / -1;">
                <span>🤝</span>
                <p>Login to see and post teammate requests.</p>
            </div>
        `;

        return;

    }

    try {

        // Always fetch the full public list first — everyone
        // should be able to see every request regardless of
        // whether AI matching succeeds.
        const response = await fetch("http://localhost:5000/api/teams");

        const allRequests = await response.json();

        const myRequests = allRequests.filter(request =>
            request.userId && request.userId._id === currentUser._id
        );

        const otherRequests = allRequests.filter(request =>
            request.userId && request.userId._id !== currentUser._id
        );

        if (allRequests.length === 0) {

            container.innerHTML = `
                <div class="skills-empty" style="grid-column: 1 / -1;">
                    <span>🤝</span>
                    <p>No teammate requests yet. Be the first to post one!</p>
                </div>
            `;

            return;

        }

        // Try AI scoring on top of the public list
        try {

            const aiResponse = await fetch(
                `http://localhost:5000/api/ai-teammates/${currentUser._id}`
            );

            if (!aiResponse.ok) {
                throw new Error("AI teammate endpoint returned an error");
            }

            const aiResults = await aiResponse.json();

            console.log("AI teammate match results:", aiResults);

            // Build a lookup of scores by request id
            const scoreMap = {};

            aiResults.forEach(item => {
                scoreMap[item.request._id] = item;
            });

            // Sort other students' requests: matched (scored)
            // first by score descending, unscored after
            const sortedOthers = [...otherRequests].sort((a, b) => {

                const scoreA = scoreMap[a._id] ? scoreMap[a._id].score : -1;
                const scoreB = scoreMap[b._id] ? scoreMap[b._id].score : -1;

                return scoreB - scoreA;

            });

            container.innerHTML = "";

            // Your own posts always show first, so you can
            // manage who's interested without hunting for them
            myRequests.forEach(request => {

                container.appendChild(
                    createTeamRequestCard(request, currentUser)
                );

            });

            sortedOthers.forEach(request => {

                const scored = scoreMap[request._id];

                container.appendChild(
                    createTeamRequestCard(
                        request,
                        currentUser,
                        scored ? scored.score : undefined,
                        scored ? scored.reason : undefined
                    )
                );

            });

            return;

        } catch (aiError) {

            console.warn(
                "AI teammate matching unavailable, showing unranked list:",
                aiError.message
            );

        }

        // Fallback: show everyone, unranked, no badges
        // (own posts still first)
        container.innerHTML = "";

        myRequests.forEach(request => {

            container.appendChild(
                createTeamRequestCard(request, currentUser)
            );

        });

        otherRequests.forEach(request => {

            container.appendChild(
                createTeamRequestCard(request, currentUser)
            );

        });

    } catch (error) {

        console.error("Error loading team requests:", error);

    }

}

// Load when the page opens (in case already logged in)
loadTeamRequests();


// ==========================================
// ADMIN PANEL
// ==========================================
//
// IMPORTANT: the Admin nav button and Admin page
// do NOT exist anywhere in index.html. They are built
// here in JavaScript and only inserted into the page
// after applyRolePermissions() has confirmed (via the
// backend) that the logged-in user's role is "admin".
// This means non-admin users have zero trace of the
// admin panel in their page source — there's nothing
// to find by viewing source or inspecting the DOM,
// because it simply isn't there unless you're an admin.

// (adminUIInjected is declared at the top of this file
// so it's available before applyRolePermissions() runs)


function injectAdminUI() {

    if (adminUIInjected) {
        return; // already built, don't duplicate
    }

    // 1. Add the sidebar nav button
    const nav = document.querySelector(".sidebar nav");

    if (nav && !document.getElementById("adminNavBtn")) {

        const adminBtn = document.createElement("button");

        adminBtn.className = "nav-item";
        adminBtn.id = "adminNavBtn";
        adminBtn.dataset.page = "admin";

        adminBtn.innerHTML = `
            🛠️
            <span>Admin Panel</span>
        `;

        adminBtn.addEventListener("click", function () {
            showPage("admin");
        });

        nav.appendChild(adminBtn);

    }


    // 2. Add the Admin page content
    const content = document.querySelector("section.content");

    if (content && !document.getElementById("page-admin")) {

        const adminPage = document.createElement("div");

        adminPage.className = "page";
        adminPage.id = "page-admin";

        adminPage.innerHTML = `

            <div class="page-header">
                <div>
                    <small>DEVELOPER ACCESS</small>
                    <h1>Admin Panel</h1>
                    <p>Full read/delete access to all users, events, and registrations.</p>
                </div>
            </div>

            <div class="admin-tabs">
                <button class="admin-tab-btn active" data-admin-tab="users">Users</button>
                <button class="admin-tab-btn" data-admin-tab="events">Events</button>
                <button class="admin-tab-btn" data-admin-tab="registrations">Registrations</button>
                <button class="admin-tab-btn" data-admin-tab="hostrequests">Host Requests</button>
            </div>

            <div class="admin-tab-content active" id="admin-tab-users">
                <div class="admin-table-wrap">
                    <table class="admin-table" id="adminUsersTable">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>College</th>
                                <th>Course</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="adminUsersBody"></tbody>
                    </table>
                </div>
            </div>

            <div class="admin-tab-content" id="admin-tab-events">
                <div class="admin-table-wrap">
                    <table class="admin-table" id="adminEventsTable">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Category</th>
                                <th>Host</th>
                                <th>Venue</th>
                                <th>Date</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="adminEventsBody"></tbody>
                    </table>
                </div>
            </div>

            <div class="admin-tab-content" id="admin-tab-registrations">
                <div class="admin-table-wrap">
                    <table class="admin-table" id="adminRegistrationsTable">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Event</th>
                                <th>Status</th>
                                <th>Registered On</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="adminRegistrationsBody"></tbody>
                    </table>
                </div>
            </div>

            <div class="admin-tab-content" id="admin-tab-hostrequests">
                <div class="admin-table-wrap">
                    <table class="admin-table" id="adminHostRequestsTable">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>College</th>
                                <th>Requested On</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="adminHostRequestsBody"></tbody>
                    </table>
                </div>
            </div>

        `;

        content.appendChild(adminPage);

        // Wire up the tab buttons now that they exist
        adminPage.querySelectorAll(".admin-tab-btn").forEach(btn => {

            btn.addEventListener("click", function () {

                const tab = this.dataset.adminTab;

                adminPage.querySelectorAll(".admin-tab-btn").forEach(b =>
                    b.classList.remove("active")
                );

                adminPage.querySelectorAll(".admin-tab-content").forEach(c =>
                    c.classList.remove("active")
                );

                this.classList.add("active");

                const tabContent =
                    document.getElementById(`admin-tab-${tab}`);

                if (tabContent) {
                    tabContent.classList.add("active");
                }

            });

        });

    }

    adminUIInjected = true;

}


function removeAdminUI() {

    const adminBtn = document.getElementById("adminNavBtn");
    const adminPage = document.getElementById("page-admin");

    if (adminBtn) adminBtn.remove();
    if (adminPage) adminPage.remove();

    adminUIInjected = false;

}


// ==========================================

// --- Tab switching is wired up inside injectAdminUI()
//     above, since these tab buttons don't exist in the
//     DOM until an admin logs in.


// --- Load everything (users, events, registrations) ---

async function loadAdminData() {

    const currentUser = getCurrentUser();

    if (!currentUser || currentUser.role !== "admin") {
        return;
    }

    await Promise.all([
        loadAdminUsers(currentUser._id),
        loadAdminEvents(currentUser._id),
        loadAdminRegistrations(currentUser._id),
        loadAdminHostRequests()
    ]);

}


// --- Users tab ---

async function loadAdminUsers(adminId) {

    const tbody =
        document.getElementById("adminUsersBody");

    if (!tbody) return;

    try {

        const response = await fetch(
            `http://localhost:5000/api/admin/users`,
            authHeaders()
        );

        const users = await response.json();

        if (!response.ok) {

            tbody.innerHTML = `
                <tr class="admin-empty-row">
                    <td colspan="6">${users.message || "Failed to load users"}</td>
                </tr>
            `;

            return;

        }

        if (users.length === 0) {

            tbody.innerHTML = `
                <tr class="admin-empty-row">
                    <td colspan="6">No users found.</td>
                </tr>
            `;

            return;

        }

        tbody.innerHTML = "";

        users.forEach(user => {

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td><span class="admin-role-badge ${user.role}">${user.role}</span></td>
                <td>${user.college || "—"}</td>
                <td>${user.course || "—"}</td>
                <td>
                    <button class="admin-delete-btn" data-user-id="${user._id}">
                        Delete
                    </button>
                </td>
            `;

            tbody.appendChild(row);

            row.querySelector(".admin-delete-btn")
                .addEventListener("click", function () {

                    adminDeleteUser(this.dataset.userId);

                });

        });

    } catch (error) {

        console.error("Error loading admin users:", error);

    }

}


async function adminDeleteUser(userId) {

    const currentUser = getCurrentUser();

    const confirmDelete = confirm(
        "Delete this user? This also deletes their events and registrations. This cannot be undone."
    );

    if (!confirmDelete) return;

    try {

        const response = await fetch(
            `http://localhost:5000/api/admin/users/${userId}`,
            authHeaders({
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            })
        );

        const data = await response.json();

        if (response.ok) {

            showToast("User deleted");

            loadAdminData();

        } else {

            alert(data.message);

        }

    } catch (error) {

        console.error("Admin delete user error:", error);

        alert("Could not connect to backend.");

    }

}


// --- Events tab ---

async function loadAdminEvents(adminId) {

    const tbody =
        document.getElementById("adminEventsBody");

    if (!tbody) return;

    try {

        const response = await fetch(
            `http://localhost:5000/api/admin/events`,
            authHeaders()
        );

        const events = await response.json();

        if (!response.ok) {

            tbody.innerHTML = `
                <tr class="admin-empty-row">
                    <td colspan="6">${events.message || "Failed to load events"}</td>
                </tr>
            `;

            return;

        }

        if (events.length === 0) {

            tbody.innerHTML = `
                <tr class="admin-empty-row">
                    <td colspan="6">No events found.</td>
                </tr>
            `;

            return;

        }

        tbody.innerHTML = "";

        events.forEach(event => {

            const hostName =
                event.createdBy ? event.createdBy.name : "Unknown";

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${event.title}</td>
                <td>${event.category}</td>
                <td>${hostName}</td>
                <td>${event.venue}</td>
                <td>${new Date(event.date).toLocaleDateString()}</td>
                <td>
                    <button class="admin-delete-btn" data-event-id="${event._id}">
                        Delete
                    </button>
                </td>
            `;

            tbody.appendChild(row);

            row.querySelector(".admin-delete-btn")
                .addEventListener("click", function () {

                    adminDeleteEvent(this.dataset.eventId);

                });

        });

    } catch (error) {

        console.error("Error loading admin events:", error);

    }

}


async function adminDeleteEvent(eventId) {

    const currentUser = getCurrentUser();

    const confirmDelete = confirm(
        "Delete this event? This also deletes its registrations. This cannot be undone."
    );

    if (!confirmDelete) return;

    try {

        const response = await fetch(
            `http://localhost:5000/api/admin/events/${eventId}`,
            authHeaders({
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            })
        );

        const data = await response.json();

        if (response.ok) {

            showToast("Event deleted");

            loadAdminData();

            // Also refresh the public events list if it's loaded
            loadEvents();

        } else {

            alert(data.message);

        }

    } catch (error) {

        console.error("Admin delete event error:", error);

        alert("Could not connect to backend.");

    }

}


// --- Registrations tab ---

async function loadAdminRegistrations(adminId) {

    const tbody =
        document.getElementById("adminRegistrationsBody");

    if (!tbody) return;

    try {

        const response = await fetch(
            `http://localhost:5000/api/admin/registrations`,
            authHeaders()
        );

        const registrations = await response.json();

        if (!response.ok) {

            tbody.innerHTML = `
                <tr class="admin-empty-row">
                    <td colspan="5">${registrations.message || "Failed to load registrations"}</td>
                </tr>
            `;

            return;

        }

        if (registrations.length === 0) {

            tbody.innerHTML = `
                <tr class="admin-empty-row">
                    <td colspan="5">No registrations found.</td>
                </tr>
            `;

            return;

        }

        tbody.innerHTML = "";

        registrations.forEach(reg => {

            const studentName =
                reg.userId ? reg.userId.name : "Unknown";

            const eventTitle =
                reg.eventId ? reg.eventId.title : "Deleted event";

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${studentName}</td>
                <td>${eventTitle}</td>
                <td>${reg.status}</td>
                <td>${new Date(reg.createdAt).toLocaleDateString()}</td>
                <td>
                    <button class="admin-delete-btn" data-reg-id="${reg._id}">
                        Delete
                    </button>
                </td>
            `;

            tbody.appendChild(row);

            row.querySelector(".admin-delete-btn")
                .addEventListener("click", function () {

                    adminDeleteRegistration(this.dataset.regId);

                });

        });

    } catch (error) {

        console.error("Error loading admin registrations:", error);

    }

}


async function adminDeleteRegistration(registrationId) {

    const currentUser = getCurrentUser();

    const confirmDelete = confirm(
        "Delete this registration? This cannot be undone."
    );

    if (!confirmDelete) return;

    try {

        const response = await fetch(
            `http://localhost:5000/api/admin/registrations/${registrationId}`,
            authHeaders({
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            })
        );

        const data = await response.json();

        if (response.ok) {

            showToast("Registration deleted");

            loadAdminData();

        } else {

            alert(data.message);

        }

    } catch (error) {

        console.error("Admin delete registration error:", error);

        alert("Could not connect to backend.");

    }

}

// ==========================================
// LOGOUT
// ==========================================
//
// Clears the saved session (token + user) and drops the
// person back to the login screen. A full page reload is the
// simplest reliable way to reset every widget/list back to
// its logged-out state, rather than manually un-rendering
// everything the dashboard filled in.

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", function () {

        localStorage.removeItem("campusToken");
        localStorage.removeItem("campusUser");

        window.location.reload();

    });

}


// ==========================================
// ADMIN: HOST REQUESTS
// ==========================================
//
// Anyone can ask for Host access when they sign up, but they stay a
// student until an admin approves them here. Rows are built with
// textContent (not innerHTML) because names and emails are typed by
// users and must never be run as HTML.

async function loadAdminHostRequests() {

    const tbody = document.getElementById("adminHostRequestsBody");

    if (!tbody) return;

    try {

        const response = await authFetch("/api/admin/host-requests");

        const requests = await response.json();

        const tabButton = document.querySelector('[data-admin-tab="hostrequests"]');

        if (!response.ok) {

            tbody.innerHTML = "";

            const errorRow = document.createElement("tr");
            errorRow.className = "admin-empty-row";
            const errorCell = document.createElement("td");
            errorCell.colSpan = 5;
            errorCell.textContent = requests.message || "Failed to load host requests";
            errorRow.appendChild(errorCell);
            tbody.appendChild(errorRow);

            return;

        }

        if (tabButton) {
            tabButton.textContent =
                requests.length > 0 ? `Host Requests (${requests.length})` : "Host Requests";
        }

        tbody.innerHTML = "";

        if (requests.length === 0) {

            const emptyRow = document.createElement("tr");
            emptyRow.className = "admin-empty-row";
            const emptyCell = document.createElement("td");
            emptyCell.colSpan = 5;
            emptyCell.textContent = "No pending host requests.";
            emptyRow.appendChild(emptyCell);
            tbody.appendChild(emptyRow);

            return;

        }

        requests.forEach(user => {

            const row = document.createElement("tr");

            [
                user.name,
                user.email,
                user.college || "—",
                new Date(user.createdAt).toLocaleDateString()
            ].forEach(text => {

                const cell = document.createElement("td");
                cell.textContent = text;
                row.appendChild(cell);

            });

            const actionCell = document.createElement("td");

            const approveBtn = document.createElement("button");
            approveBtn.className = "admin-delete-btn";
            approveBtn.style.background = "#21b573";
            approveBtn.style.marginRight = "6px";
            approveBtn.textContent = "Approve";
            approveBtn.addEventListener("click", () => decideHostRequest(user._id, "approve"));

            const rejectBtn = document.createElement("button");
            rejectBtn.className = "admin-delete-btn";
            rejectBtn.textContent = "Reject";
            rejectBtn.addEventListener("click", () => decideHostRequest(user._id, "reject"));

            actionCell.appendChild(approveBtn);
            actionCell.appendChild(rejectBtn);
            row.appendChild(actionCell);

            tbody.appendChild(row);

        });

    } catch (error) {

        console.error("Error loading host requests:", error);

    }

}


async function decideHostRequest(userId, action) {

    const confirmed = confirm(
        action === "approve"
            ? "Approve this person as a Host? They will be able to create and manage events."
            : "Reject this host request?"
    );

    if (!confirmed) return;

    try {

        const response = await authFetch(
            `/api/admin/host-requests/${userId}/${action}`,
            { method: "PUT" }
        );

        const data = await response.json();

        if (response.ok) {

            showToast(data.message);

            loadAdminData();

        } else {

            alert(data.message || "Something went wrong");

        }

    } catch (error) {

        console.error("Host request decision error:", error);

        alert("Could not connect to the server.");

    }

}