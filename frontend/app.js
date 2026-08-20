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

const eventForm =
    document.getElementById("eventForm");


if (eventForm) {

    eventForm.addEventListener("submit", function (event) {

        // Stop page reload
        event.preventDefault();


        // Get form values
        const eventName =
            this.querySelector(
                'input[type="text"]'
            ).value;


        // Show success message
        showToast(
            `${eventName} created successfully! 🎉`
        );


        // Clear form
        this.reset();

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