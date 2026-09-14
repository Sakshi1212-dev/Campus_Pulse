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


function showToast(message) {

    if (!toast) return;


    toast.innerText = message;

    toast.classList.add("show");


    setTimeout(() => {

        toast.classList.remove("show");

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
           capacity: Number(formData.get("capacity")),

           userId: currentUser._id
        };

        console.log("Event being sent:", eventData);

        try {

            const response = await fetch("http://localhost:5000/api/events", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(eventData)

            });

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

const notificationItems =
    document.querySelectorAll(".notification");


notificationItems.forEach(notification => {

    notification.addEventListener("click", function () {

        this.classList.remove("unread");

        showToast("Notification marked as read ✓");

    });

});


// ==========================================
// 7. CATEGORY BUTTONS
// ==========================================

const categories =
    document.querySelectorAll(".category");


categories.forEach(category => {

    category.addEventListener("click", function () {

        const categoryName =
            this.innerText
                .split("\n")[0]
                .trim();


        showToast(
            `Showing ${categoryName} events`
        );


        showPage("events");

    });

});


// ==========================================
// 8. TEAM INVITATION
// ==========================================

const inviteButtons =
    document.querySelectorAll(".team-card .register-btn");


inviteButtons.forEach(button => {

    button.addEventListener("click", function () {

        this.innerText = "Invited ✓";

        this.disabled = true;

        showToast(
            "Team invitation sent! 👥"
        );

    });

});


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


// ==========================================
// 10. CREATE EVENT CARD (reusable)
//     Used by Events page, Recommended For
//     You, and Made For You / Recommendations
// ==========================================

function createEventCard(event, currentUser, isHost, matchPercent) {

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
        ? `<button
                class="register-btn delete-event-btn"
                data-event-id="${event._id}"
                style="background:#e34267;"
           >
                Delete Event
           </button>`
        : `<button
                class="register-btn event-register-btn"
                data-event-id="${event._id}"
                ${isHost ? "disabled style=\"opacity:0.5;cursor:not-allowed;\"" : ""}
           >
                ${isHost ? "Hosts can't register" : "Register Now"}
           </button>`;

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

    eventCard.innerHTML = `

        <div class="event-card-top">

            <span class="event-category">
                ${event.category}
            </span>

            ${matchBadgeHTML}

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
                    <span>👥</span>
                    <span>
                        Capacity: ${event.capacity}
                    </span>
                </div>

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

    try {

        const response = await fetch(
            "http://localhost:5000/api/events"
        );

        const events = await response.json();

        const isHost = currentUser.role === "host";

        // ==========================================
        // MATCH SCORING
        //
        // For each event, we check how many of the
        // student's skills relate to it, and produce a
        // 0–100% score:
        //   - a skill found as a full phrase in the
        //     event's title/description/category counts
        //     as a full match (weight 1)
        //   - a skill found only as a partial word match
        //     counts as a partial match (weight 0.6)
        // The score is the average match strength across
        // all of the student's skills, so having more of
        // your skills reflected in an event pushes its
        // score higher.
        // ==========================================

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
            "Recommendation debug — your skills:",
            skills,
            "| total events:",
            events.length,
            "| matched:",
            scoredEvents.length,
            scoredEvents.map(item => `${item.event.title} (${item.score}%)`)
        );

        const emptyMatchMessage = `
            <div class="skills-empty" style="grid-column: 1 / -1;">
                <span>🔍</span>
                <p>
                    No events match your skills yet.
                    Check back later or browse all events.
                </p>
            </div>
        `;

        // Home page: show up to 3 best matches
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
                            item.score
                        )
                    );

                });

            }

        }

        // Recommendations page: show every match, best first
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
                            item.score
                        )
                    );

                });

            }

        }

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

        const response = await fetch(
            `http://localhost:5000/api/registrations/user/${currentUser._id}`
        );

        const registrations = await response.json();

        console.log("My registrations:", registrations);

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
                "<p style='color:#7b8297;'>You haven't registered for any events yet.</p>";

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


                    <button
                        class="register-btn cancel-registration-btn"
                        data-registration-id="${reg._id}"
                        style="background:#e34267;"
                    >
                        Cancel Registration
                    </button>

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

        const response = await fetch(
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
                "Account created successfully! 🎉"
            );


            // Save logged-in user
            localStorage.setItem(
                "campusUser",
                JSON.stringify(data.user)
            );


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
            user.role === "host" ? "Host" : "Student";
    }

    const roleDisplay =
        user.role === "host" ? "Host" : "Student";

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

                // Save logged-in user
                localStorage.setItem(
                    "campusUser",
                    JSON.stringify(data.user)
                );

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
            {
                method: "DELETE",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    userId: currentUser._id
                })
            }
        );

        const data = await response.json();

        if (response.ok) {

            showToast("Event deleted successfully! 🗑️");

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

            userId: currentUser._id,

            name: document.getElementById("regName").value,

            branch: document.getElementById("regBranch").value,

            year: document.getElementById("regYear").value,

            email: document.getElementById("regEmail").value

        };

        try {

            const response = await fetch(
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
                {
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
                }
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
        loadAdminRegistrations(currentUser._id)
    ]);

}


// --- Users tab ---

async function loadAdminUsers(adminId) {

    const tbody =
        document.getElementById("adminUsersBody");

    if (!tbody) return;

    try {

        const response = await fetch(
            `http://localhost:5000/api/admin/users?adminId=${adminId}`
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
            {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adminId: currentUser._id })
            }
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
            `http://localhost:5000/api/admin/events?adminId=${adminId}`
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
            {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adminId: currentUser._id })
            }
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
            `http://localhost:5000/api/admin/registrations?adminId=${adminId}`
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
            {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adminId: currentUser._id })
            }
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