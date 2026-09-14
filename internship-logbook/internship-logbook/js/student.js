// ================================
// STUDENT NAVIGATION
// ================================

const navLinks = document.querySelectorAll(".nav-link[data-section]");
const pageSections = document.querySelectorAll(".page-section");

navLinks.forEach(function (link) {
  link.addEventListener("click", function (event) {
    event.preventDefault();

    const targetSection = link.dataset.section;

    navLinks.forEach(function (nav) {
      nav.classList.remove("active");
    });

    link.classList.add("active");

    pageSections.forEach(function (section) {
      section.classList.remove("active-section");
    });

    const sectionToShow = document.getElementById(targetSection);

    if (sectionToShow) {
      sectionToShow.classList.add("active-section");
    }
  });
});

// ================================
// DAILY LOG MODAL
// ================================

const addLogButton = document.getElementById("addLogButton");
const logModal = document.getElementById("logModal");
const closeLogModal = document.getElementById("closeLogModal");
const cancelLogModal = document.getElementById("cancelLogModal");
const dailyLogForm = document.getElementById("dailyLogForm");

// Open modal

if (addLogButton && logModal) {
  addLogButton.addEventListener("click", function () {
    logModal.classList.add("show");
  });
}

// Close modal using X

if (closeLogModal && logModal) {
  closeLogModal.addEventListener("click", function () {
    logModal.classList.remove("show");
  });
}

// Close modal using Cancel

if (cancelLogModal && logModal) {
  cancelLogModal.addEventListener("click", function () {
    logModal.classList.remove("show");
  });
}

// ================================
// DAILY LOG SUBMISSION
// ================================

if (dailyLogForm) {
  dailyLogForm.addEventListener("submit", function (event) {
    event.preventDefault();

    /*
      BACKEND INTEGRATION POINT

      Collect form data here and send it
      to the backend/API.

      Fields:
      - logDate
      - activity
      - skills
      - challenges
    */

    const formData = {
      date: document.getElementById("logDate")?.value || "",
      activity: document.getElementById("activity")?.value || "",
      skills: document.getElementById("skills")?.value || "",
      challenges: document.getElementById("challenges")?.value || "",
    };

    console.log("Daily log ready for backend:", formData);

    // Temporary frontend behavior
    alert("Daily log submitted successfully.");

    if (logModal) {
      logModal.classList.remove("show");
    }

    dailyLogForm.reset();
  });
}

// ================================
// PROFILE EDIT
// ================================

const editProfileButton = document.getElementById("editProfileButton");
const profileEditSection = document.getElementById("profileEditSection");
const cancelProfileEdit = document.getElementById("cancelProfileEdit");
const profileEditForm = document.getElementById("profileEditForm");

// Open edit form

if (editProfileButton && profileEditSection) {
  editProfileButton.addEventListener("click", function () {
    profileEditSection.classList.add("show");

    profileEditSection.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

// Cancel editing

if (cancelProfileEdit && profileEditSection) {
  cancelProfileEdit.addEventListener("click", function () {
    profileEditSection.classList.remove("show");
  });
}

// Save profile

if (profileEditForm) {
  profileEditForm.addEventListener("submit", function (event) {
    event.preventDefault();

    /*
      BACKEND INTEGRATION POINT

      Collect profile information here
      and send it to the backend/API.

      Fields:
      - profileName
      - profileEmail
      - profilePhone
      - profileAddress
    */

    const profileData = {
      name: document.getElementById("profileName")?.value || "",
      email: document.getElementById("profileEmail")?.value || "",
      phone: document.getElementById("profilePhone")?.value || "",
      address: document.getElementById("profileAddress")?.value || "",
    };

    console.log("Profile ready for backend:", profileData);

    // Temporary frontend behavior
    alert("Profile changes saved successfully.");

    profileEditSection.classList.remove("show");
  });
}
