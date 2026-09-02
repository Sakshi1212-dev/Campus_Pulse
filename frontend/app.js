// ==========================================
// 1. PAGE NAVIGATION
// ==========================================

const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");
const pageButtons = document.querySelectorAll("[data-page]");


// Function to show a page
function showPage(pageName) {


    // Hide all pages
    pages.forEach(page => {
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
    navItems.forEach(item => {
        item.classList.remove("active");
    });


    // Add active to selected sidebar item
    navItems.forEach(item => {

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
// 3. EVENT REGISTRATION
// ==========================================

const registerButtons =
    document.querySelectorAll(".register-btn");


let registrationCount = 0;


registerButtons.forEach(button => {

    button.addEventListener("click", function () {

        // Prevent registering twice
        if (this.classList.contains("registered")) {
            showToast("You are already registered!");
            return;
        }


        // Change button
        this.innerText = "Registered ✓";

        this.classList.add("registered");


        // Increase registration count
        registrationCount++;


        showToast(
            "Event registered successfully! 🎉"
        );

    });

});


// ==========================================
// 4. TOAST MESSAGE
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
// 5. CREATE EVENT FORM
// ==========================================


const eventForm = document.getElementById("eventForm");

if (eventForm) {

    eventForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        const formData = new FormData(eventForm);
        const currentUser =
           JSON.parse(localStorage.getItem("campusUser"));

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
// 6. NOTIFICATION COUNT
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
// 7. NOTIFICATION CLICK
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
// 8. CATEGORY BUTTONS
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
// 9. TEAM INVITATION
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
// 10. INITIAL PAGE
// ==========================================

showPage("home");


// ==========================================
// 11. LOAD EVENTS FROM BACKEND
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

        // Remove old events
        eventContainer.innerHTML = "";

        // Create event cards
        events.forEach(event => {

            const eventCard =
                document.createElement("div");

            eventCard.className = "event-card";

            eventCard.innerHTML = `

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
                            <span>👥</span>
                            <span>
                                Capacity: ${event.capacity}
                            </span>
                        </div>

                    </div>


                    <button
                        class="register-btn event-register-btn"
                        data-event-id="${event._id}"
                    >
                        Register Now
                    </button>

                </div>

            `;

            eventContainer.appendChild(eventCard);

        });

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
//   12 .EVENTS THIS MONTH COUNT
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


    // Go to Home
    showPage("home");

}

// ==========================================
// ROLE BASED ACCESS
// ==========================================

function applyRolePermissions() {

    const user = JSON.parse(
        localStorage.getItem("campusUser")
    );

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

}

// ==========================================
// HOST / STUDENT PERMISSIONS
// ==========================================

function applyRolePermissions() {

    const user = JSON.parse(
        localStorage.getItem("campusUser")
    );

    const hostOnlyElements =
        document.querySelectorAll(".host-only");

    if (!user) {
        return;
    }

    hostOnlyElements.forEach(element => {

        if (user.role === "host") {

            // Host can see Create Event
            element.style.display = "";

        } else {

            // Student cannot see Create Event
            element.style.display = "none";

        }

    });

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

async function deleteEvent(eventId) {

    const currentUser =
        JSON.parse(localStorage.getItem("campusUser"));

    if (!currentUser) {
        alert("Please login first");
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

            alert("Event deleted successfully!");

            loadEvents();

        } else {

            alert(data.message);

        }

    } catch (error) {

        console.error("Delete error:", error);

        alert("Could not connect to backend.");

    }
}

async function registerForEvent(eventId) {

    // Logged-in student
    const currentUser =
        JSON.parse(localStorage.getItem("campusUser"));

    // Login nahi hai
    if (!currentUser) {
        alert("Please login first to register.");
        return;
    }

    // Host ko student registration nahi karne dena
    if (currentUser.role === "host") {
        alert("Hosts cannot register for events.");
        return;
    }

    try {

        const response = await fetch(
            "http://localhost:5000/api/registrations",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    userId: currentUser._id,
                    eventId: eventId
                })
            }
        );

        const data = await response.json();

        if (response.ok) {

            alert("Successfully registered for event! 🎉");

        } else {

            alert(data.message || "Registration failed");

        }

    } catch (error) {

        console.error("Registration error:", error);

        alert("Could not connect to backend.");

    }

}