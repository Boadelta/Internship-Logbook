// ================================
// SUPERVISOR NAVIGATION
// ================================

const navLinks = document.querySelectorAll(".nav-link[data-section]");

const pageSections = document.querySelectorAll(".page-section");

navLinks.forEach(function (link) {
  link.addEventListener("click", function (event) {
    event.preventDefault();

    const targetSection = link.dataset.section;

    // Remove active state from navigation

    navLinks.forEach(function (nav) {
      nav.classList.remove("active");
    });

    // Add active state to clicked navigation

    link.classList.add("active");

    // Hide all sections

    pageSections.forEach(function (section) {
      section.classList.remove("active-section");
    });

    // Show selected section

    const sectionToShow = document.getElementById(targetSection);

    if (sectionToShow) {
      sectionToShow.classList.add("active-section");
    }
  });
});

// ================================
// DASHBOARD SECTION BUTTONS
// ================================

const sectionButtons = document.querySelectorAll("[data-section-button]");

sectionButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const targetSection = button.dataset.sectionButton;

    // Remove active navigation

    navLinks.forEach(function (nav) {
      nav.classList.remove("active");
    });

    // Find matching navigation link

    const matchingNav = document.querySelector(
      `.nav-link[data-section="${targetSection}"]`,
    );

    if (matchingNav) {
      matchingNav.classList.add("active");
    }

    // Hide all sections

    pageSections.forEach(function (section) {
      section.classList.remove("active-section");
    });

    // Show target section

    const sectionToShow = document.getElementById(targetSection);

    if (sectionToShow) {
      sectionToShow.classList.add("active-section");
    }
  });
});

// ================================
// PROFILE EDIT
// ================================

const editSupervisorButton = document.getElementById("editSupervisorButton");

const supervisorEditSection = document.getElementById("supervisorEditSection");

const cancelSupervisorEdit = document.getElementById("cancelSupervisorEdit");

const supervisorEditForm = document.getElementById("supervisorEditForm");

// Open edit form

editSupervisorButton.addEventListener("click", function () {
  supervisorEditSection.classList.add("show");

  supervisorEditSection.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
});

// Cancel editing

cancelSupervisorEdit.addEventListener("click", function () {
  supervisorEditSection.classList.remove("show");
});

// Save profile

supervisorEditForm.addEventListener("submit", function (event) {
  event.preventDefault();

  alert("Profile changes saved successfully.");

  supervisorEditSection.classList.remove("show");
});
