"use strict";

/*
=========================================================
ADMIN DASHBOARD CONTROLLER
=========================================================

Frontend controller for the Internship Logbook admin panel.

This file currently works with frontend state.

BACKEND READY:

The following functions can later receive API data:

setDashboardData()
setStudents()
setSupervisors()
setInternships()
setLogs()
setAdminProfile()

The modal system is completely frontend-based for now.

=========================================================
*/

// ========================================================
// APPLICATION STATE
// ========================================================

const adminState = {
  currentSection: "dashboard",

  students: [],

  supervisors: [],

  internships: [],

  logs: [],

  dashboard: {
    totalStudents: 0,

    totalSupervisors: 0,

    activeInternships: 0,

    pendingReviews: 0,

    activeStudents: 0,

    pendingPlacements: 0,

    completedInternships: 0,
  },

  profile: {
    id: null,

    fullName: "",

    email: "",

    phone: "",

    role: "Administrator",
  },
};

// ========================================================
// DOM HELPERS
// ========================================================
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

function getElement(id) {
  return document.getElementById(id);
}


function setText(id, value) {
  const element = getElement(id);

  if (!element) {
    return;
  }

  if (value === null || value === undefined) {
    element.textContent = "";

    return;
  }

  element.textContent = String(value);
}

// ========================================================
// HTML ESCAPING
// ========================================================

function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ========================================================
// TEXT HELPERS
// ========================================================

function capitalize(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const text = String(value);

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return escapeHTML(value);
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ========================================================
// NAVIGATION
// ========================================================

const navLinks = document.querySelectorAll(".nav-link[data-section]");

const pageSections = document.querySelectorAll(".page-section");

const pageInformation = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Overview of your internship programme.",
  },

  students: {
    title: "Students",
    subtitle: "Manage students registered in the internship programme.",
  },

  supervisors: {
    title: "Supervisors",
    subtitle: "Manage internship supervisors and student assignments.",
  },

  internships: {
    title: "Internships",
    subtitle: "Manage student internship placements.",
  },

  logs: {
    title: "Log Reviews",
    subtitle: "Monitor internship logs submitted by students.",
  },

  profile: {
    title: "My Profile",
    subtitle: "View and manage your administrator information.",
  },
};

function updatePageHeader(sectionName) {
  const information = pageInformation[sectionName];

  if (!information) {
    return;
  }

  setText("pageTitle", information.title);

  setText("pageSubtitle", information.subtitle);
}

function showSection(sectionName) {
  const section = getElement(sectionName);

  if (!section) {
    return;
  }

  adminState.currentSection = sectionName;

  navLinks.forEach(function (link) {
    link.classList.toggle("active", link.dataset.section === sectionName);
  });

  pageSections.forEach(function (page) {
    page.classList.remove("active-section");
  });

  section.classList.add("active-section");

  updatePageHeader(sectionName);

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

navLinks.forEach(function (link) {
  link.addEventListener("click", function (event) {
    event.preventDefault();

    showSection(link.dataset.section);
  });
});

// ========================================================
// DASHBOARD SECTION BUTTONS
// ========================================================

const sectionButtons = document.querySelectorAll("[data-section-button]");

sectionButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const targetSection = button.dataset.sectionButton;

    showSection(targetSection);
  });
});

// ========================================================
// DASHBOARD STATISTICS
// ========================================================

function renderDashboardStats() {
  const dashboard = adminState.dashboard;

  setText("totalStudents", dashboard.totalStudents);

  setText("totalSupervisors", dashboard.totalSupervisors);

  setText("activeInternships", dashboard.activeInternships);

  setText("pendingReviews", dashboard.pendingReviews);

  setText("overviewActiveStudents", dashboard.activeStudents);

  setText("pendingPlacements", dashboard.pendingPlacements);

  setText("completedInternships", dashboard.completedInternships);

  setText("overviewPendingReviews", dashboard.pendingReviews);
}

// ========================================================
// ADMIN PROFILE
// ========================================================

function getInitials(name) {
  if (!name) {
    return "--";
  }

  const words = String(name).trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "--";
  }

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function renderAdminProfile() {
  const profile = adminState.profile;

  setText("adminDisplayName", profile.fullName || "Administrator");

  setText("adminDisplayRole", profile.role || "Administrator");

  setText("adminFullName", profile.fullName || "Not available");

  setText("adminEmail", profile.email || "Not available");

  setText("adminPhone", profile.phone || "Not available");

  setText("adminRole", profile.role || "Administrator");

  const avatar = getElement("adminAvatar");

  if (avatar) {
    avatar.textContent = getInitials(profile.fullName);
  }
}

// ========================================================
// MODAL SYSTEM
// ========================================================

const modalOverlay = getElement("modalOverlay");

const modal = getElement("modal");

const modalTitle = getElement("modalTitle");

const modalSubtitle = getElement("modalSubtitle");

const modalBody = getElement("modalBody");

const modalCloseButton = getElement("modalCloseButton");

let lastFocusedElement = null;

function openModal(title, subtitle, content) {
  if (!modalOverlay || !modal || !modalTitle || !modalBody) {
    console.error("Modal elements are missing from admin.html.");

    return;
  }

  lastFocusedElement = document.activeElement;

  modalTitle.textContent = title || "Details";

  if (modalSubtitle) {
    modalSubtitle.textContent = subtitle || "";
  }

  modalBody.innerHTML = content || "";

  modalOverlay.classList.add("show");

  modalOverlay.setAttribute("aria-hidden", "false");

  document.body.classList.add("modal-open");

  const firstInput = modalBody.querySelector("input, select, textarea, button");

  if (firstInput) {
    setTimeout(function () {
      firstInput.focus();
    }, 50);
  }
}

function closeModal() {
  if (!modalOverlay) {
    return;
  }

  modalOverlay.classList.remove("show");

  modalOverlay.setAttribute("aria-hidden", "true");

  if (modalBody) {
    modalBody.innerHTML = "";
  }

  document.body.classList.remove("modal-open");

  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }

  lastFocusedElement = null;
}

if (modalCloseButton) {
  modalCloseButton.addEventListener("click", closeModal);
}

if (modalOverlay) {
  modalOverlay.addEventListener("click", function (event) {
    if (event.target === modalOverlay) {
      closeModal();
    }
  });
}

document.addEventListener("keydown", function (event) {
  if (
    event.key === "Escape" &&
    modalOverlay &&
    modalOverlay.classList.contains("show")
  ) {
    closeModal();
  }
});

// ========================================================
// STUDENT SEARCH & FILTER
// ========================================================

const studentSearch = getElement("studentSearch");

const studentStatusFilter = getElement("studentStatusFilter");

const studentDepartmentFilter = getElement("studentDepartmentFilter");

function filterStudents() {
  const searchValue = studentSearch
    ? studentSearch.value.toLowerCase().trim()
    : "";

  const statusValue = studentStatusFilter
    ? studentStatusFilter.value.toLowerCase()
    : "";

  const departmentValue = studentDepartmentFilter
    ? studentDepartmentFilter.value.toLowerCase()
    : "";

  const filteredStudents = adminState.students.filter(function (student) {
    const studentText = [
      student.name,
      student.matricNumber,
      student.email,
      student.department,
      student.company,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = !searchValue || studentText.includes(searchValue);

    const matchesStatus =
      !statusValue ||
      String(student.status || "").toLowerCase() === statusValue;

    const matchesDepartment =
      !departmentValue ||
      String(student.department || "").toLowerCase() === departmentValue;

    return matchesSearch && matchesStatus && matchesDepartment;
  });

  renderStudents(filteredStudents);
}

function renderStudents(students) {
  const tableBody = getElement("studentsTableBody");

  if (!tableBody) {
    return;
  }

  if (!Array.isArray(students) || students.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="table-empty"
        >
          No students found.
        </td>
      </tr>
    `;

    return;
  }

  tableBody.innerHTML = students
    .map(function (student) {
      const id = escapeHTML(student.id ?? "");

      return `
            <tr data-id="${id}">

              <td>
                ${escapeHTML(student.name || "—")}
              </td>

              <td>
                ${escapeHTML(student.matricNumber || "—")}
              </td>

              <td>
                ${escapeHTML(student.department || "—")}
              </td>

              <td>
                ${escapeHTML(student.company || "—")}
              </td>

              <td>

                <span class="status-badge">
                  ${escapeHTML(capitalize(student.status) || "—")}
                </span>

              </td>

              <td>

                <button
                  type="button"
                  class="secondary-button"
                  data-action="view-student"
                  data-student-id="${id}"
                >
                  View
                </button>

              </td>

            </tr>
          `;
    })
    .join("");
}

if (studentSearch) {
  studentSearch.addEventListener("input", filterStudents);
}

if (studentStatusFilter) {
  studentStatusFilter.addEventListener("change", filterStudents);
}

if (studentDepartmentFilter) {
  studentDepartmentFilter.addEventListener("change", filterStudents);
}

// ========================================================
// SUPERVISOR SEARCH & FILTER
// ========================================================

const supervisorSearch = getElement("supervisorSearch");

const supervisorStatusFilter = getElement("supervisorStatusFilter");

const supervisorDepartmentFilter = getElement("supervisorDepartmentFilter");

function filterSupervisors() {
  const searchValue = supervisorSearch
    ? supervisorSearch.value.toLowerCase().trim()
    : "";

  const statusValue = supervisorStatusFilter
    ? supervisorStatusFilter.value.toLowerCase()
    : "";

  const departmentValue = supervisorDepartmentFilter
    ? supervisorDepartmentFilter.value.toLowerCase()
    : "";

  const filteredSupervisors = adminState.supervisors.filter(
    function (supervisor) {
      const supervisorText = [
        supervisor.name,
        supervisor.email,
        supervisor.department,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !searchValue || supervisorText.includes(searchValue);

      const matchesStatus =
        !statusValue ||
        String(supervisor.status || "").toLowerCase() === statusValue;

      const matchesDepartment =
        !departmentValue ||
        String(supervisor.department || "").toLowerCase() === departmentValue;

      return matchesSearch && matchesStatus && matchesDepartment;
    },
  );

  renderSupervisors(filteredSupervisors);
}

function renderSupervisors(supervisors) {
  const tableBody = getElement("supervisorsTableBody");

  if (!tableBody) {
    return;
  }

  if (!Array.isArray(supervisors) || supervisors.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="table-empty"
        >
          No supervisors found.
        </td>
      </tr>
    `;

    return;
  }

  tableBody.innerHTML = supervisors
    .map(function (supervisor) {
      const id = escapeHTML(supervisor.id ?? "");

      return `
            <tr data-id="${id}">

              <td>
                ${escapeHTML(supervisor.name || "—")}
              </td>

              <td>
                ${escapeHTML(supervisor.email || "—")}
              </td>

              <td>
                ${escapeHTML(supervisor.department || "—")}
              </td>

              <td>
                ${escapeHTML(supervisor.studentCount ?? 0)}
              </td>

              <td>

                <span class="status-badge">
                  ${escapeHTML(capitalize(supervisor.status) || "—")}
                </span>

              </td>

              <td>

                <button
                  type="button"
                  class="secondary-button"
                  data-action="view-supervisor"
                  data-supervisor-id="${id}"
                >
                  View
                </button>

              </td>

            </tr>
          `;
    })
    .join("");
}

if (supervisorSearch) {
  supervisorSearch.addEventListener("input", filterSupervisors);
}

if (supervisorStatusFilter) {
  supervisorStatusFilter.addEventListener("change", filterSupervisors);
}

if (supervisorDepartmentFilter) {
  supervisorDepartmentFilter.addEventListener("change", filterSupervisors);
}

// ========================================================
// INTERNSHIP SEARCH & FILTER
// ========================================================

const internshipSearch = getElement("internshipSearch");

const internshipStatusFilter = getElement("internshipStatusFilter");

function filterInternships() {
  const searchValue = internshipSearch
    ? internshipSearch.value.toLowerCase().trim()
    : "";

  const statusValue = internshipStatusFilter
    ? internshipStatusFilter.value.toLowerCase()
    : "";

  const filteredInternships = adminState.internships.filter(
    function (internship) {
      const internshipText = [
        internship.studentName,
        internship.company,
        internship.supervisorName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !searchValue || internshipText.includes(searchValue);

      const matchesStatus =
        !statusValue ||
        String(internship.status || "").toLowerCase() === statusValue;

      return matchesSearch && matchesStatus;
    },
  );

  renderInternships(filteredInternships);
}

function renderInternships(internships) {
  const tableBody = getElement("internshipsTableBody");

  if (!tableBody) {
    return;
  }

  if (!Array.isArray(internships) || internships.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="table-empty"
        >
          No internship placements found.
        </td>
      </tr>
    `;

    return;
  }

  tableBody.innerHTML = internships
    .map(function (internship) {
      const id = escapeHTML(internship.id ?? "");

      return `
            <tr data-id="${id}">

              <td>
                ${escapeHTML(internship.studentName || "—")}
              </td>

              <td>
                ${escapeHTML(internship.company || "—")}
              </td>

              <td>
                ${escapeHTML(internship.supervisorName || "—")}
              </td>

              <td>
                ${formatDate(internship.startDate)}
              </td>

              <td>
                ${formatDate(internship.endDate)}
              </td>

              <td>

                <span class="status-badge">
                  ${escapeHTML(capitalize(internship.status) || "—")}
                </span>

              </td>

              <td>

                <button
                  type="button"
                  class="secondary-button"
                  data-action="view-internship"
                  data-internship-id="${id}"
                >
                  View
                </button>

              </td>

            </tr>
          `;
    })
    .join("");
}

if (internshipSearch) {
  internshipSearch.addEventListener("input", filterInternships);
}

if (internshipStatusFilter) {
  internshipStatusFilter.addEventListener("change", filterInternships);
}

// ========================================================
// LOG SEARCH & FILTER
// ========================================================

const logSearch = getElement("logSearch");

const logStatusFilter = getElement("logStatusFilter");

function filterLogs() {
  const searchValue = logSearch ? logSearch.value.toLowerCase().trim() : "";

  const statusValue = logStatusFilter
    ? logStatusFilter.value.toLowerCase()
    : "";

  const filteredLogs = adminState.logs.filter(function (log) {
    const logText = [log.studentName, log.activity, log.supervisorName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = !searchValue || logText.includes(searchValue);

    const matchesStatus =
      !statusValue || String(log.status || "").toLowerCase() === statusValue;

    return matchesSearch && matchesStatus;
  });

  renderLogs(filteredLogs);
}

function renderLogs(logs) {
  const tableBody = getElement("logsTableBody");

  if (!tableBody) {
    return;
  }

  if (!Array.isArray(logs) || logs.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="table-empty"
        >
          No internship logs found.
        </td>
      </tr>
    `;

    return;
  }

  tableBody.innerHTML = logs
    .map(function (log) {
      const id = escapeHTML(log.id ?? "");

      return `
            <tr data-id="${id}">

              <td>
                ${escapeHTML(log.studentName || "—")}
              </td>

              <td>
                ${formatDate(log.date)}
              </td>

              <td>
                ${escapeHTML(log.activity || "—")}
              </td>

              <td>
                ${escapeHTML(log.supervisorName || "—")}
              </td>

              <td>

                <span class="status-badge">
                  ${escapeHTML(capitalize(log.status) || "—")}
                </span>

              </td>

              <td>

                <button
                  type="button"
                  class="secondary-button"
                  data-action="review-log"
                  data-log-id="${id}"
                >
                  Review
                </button>

              </td>

            </tr>
          `;
    })
    .join("");
}

if (logSearch) {
  logSearch.addEventListener("input", filterLogs);
}

if (logStatusFilter) {
  logStatusFilter.addEventListener("change", filterLogs);
}

// ========================================================
// ADD STUDENT MODAL
// ========================================================

function openAddStudentModal() {
  openModal(
    "Add Student",
    "Register a new student in the internship programme.",
    `
      <form 
        class="modal-form"
        id="addStudentForm"
      >

        <div class="modal-form-grid">

          <div class="form-group">

            <label for="newStudentfName">
              First Name
            </label>

            <input
              type="text"
              id="newStudentfName"
              name="fname"
              placeholder="Enter first name"
              required
            >

          </div>

           <div class="form-group">

            <label for="newStudentlName">
              Last Name
            </label>

            <input
              type="text"
              id="newStudentlName"
              name="lname"
              placeholder="Enter Last name"
              required
            >

          </div>


          <div class="form-group">

            <label for="newStudentMatric">
              Matric Number
            </label>

            <input
              type="text"
              id="newStudentMatric"
              name="matricNumber"
              placeholder="Enter matric number"
              required
            >

          </div>


          <div class="form-group">

            <label for="newStudentEmail">
              Email Address
            </label>

            <input
              type="email"
              id="newStudentEmail"
              name="email"
              placeholder="student@example.com"
              required
            >

          </div>


           <div class="form-group">

            <label for="newStudentDepartment">
              Status
            </label>

            <select
              id="newStudentDepartment"
              name="newStudentDepartment"
            >

              <option value="CSIT">
                CSIT
              </option>

              <option value="EED">
                EED
              </option>

              <option value="PEG">
                PEG
              </option>

            </select>

          </div>


          


          <div class="form-group">

            <label for="newStudentStatus">
              Status
            </label>

            <select
              id="newStudentStatus"
              name="status"
            >

              <option value="active">
                Active
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="inactive">
                Inactive
              </option>

            </select>

          </div>
          <div class="form-group">

            <label for="newStudentGender">
              Gender
            </label>

            <select
              id="newStudentGender"
              name="gender"
            >

              <option value="Male">
                Male
              </option>

              <option value="Female">
                Female
              </option>

            </select>

          </div>

        </div>


        <div class="modal-actions">

          <button
            type="button"
            class="secondary-button"
            data-modal-cancel
          >
            Cancel
          </button>

          <button
            type="submit"
            class="primary-button"
          >
            Add Student
          </button>

        </div>

      </form>
    `,
  );
}

// ========================================================
// ADD SUPERVISOR MODAL
// ========================================================

function openAddSupervisorModal() {
  openModal(
    "Add Supervisor",
    "Register a new internship supervisor.",
    `
      <form
        class="modal-form"
        id="addSupervisorForm"
      >

        <div class="modal-form-grid">

          <div class="form-group">

            <label for="newSupervisorfName">
              First Name
            </label>

            <input
              type="text"
              id="newSupervisorfName"
              name="fname"
              placeholder="Enter supervisor First name"
              required
            >

          </div>
          <div class="form-group">

            <label for="newSupervisorlName">
              Lastt Name
            </label>

            <input
              type="text"
              id="newSupervisorlName"
              name="lname"
              placeholder="Enter supervisor Last name"
              required
            >

          </div>


          <div class="form-group">

            <label for="newSupervisorEmail">
              Email Address
            </label>

            <input
              type="email"
              id="newSupervisorEmail"
              name="email"
              placeholder="supervisor@example.com"
              required
            >

          </div>


          <div class="form-group">

            <label for="newSupervisorDepartment">
              Status
            </label>

            <select
              id="newSupervisorDepartment"
              name="newSupervisorDepartment"
            >

              <option value="CSIT">
                CSIT
              </option>

              <option value="EED">
                EED
              </option>

              <option value="PEG">
                PEG
              </option>

            </select>

          </div>


          

        </div>


        <div class="modal-actions">

          <button
            type="button"
            class="secondary-button"
            data-modal-cancel
          >
            Cancel
          </button>

          <button
            type="submit"
            class="primary-button"
          >
            Add Supervisor
          </button>

        </div>

      </form>
    `,
  );
}




// ========================================================
// VIEW STUDENT
// ========================================================

function openStudentModal(student) {
  if (!student) {
    return;
  }

  openModal(
    "Student Details",
    "Student information and internship status.",
    `
      <div class="detail-grid">

        <div class="detail-item">

          <span>
            Full Name
          </span>

          <strong>
            ${escapeHTML(student.name || "—")}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Matric Number
          </span>

          <strong>
            ${escapeHTML(student.matricNumber || "—")}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Email
          </span>

          <strong>
            ${escapeHTML(student.email || "—")}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Department
          </span>

          <strong>
            ${escapeHTML(student.department || "—")}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Company
          </span>

          <strong>
            ${escapeHTML(student.company || "—")}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Status
          </span>

          <strong>
            ${escapeHTML(capitalize(student.status) || "—")}
          </strong>

        </div>

      </div>


      <div class="modal-actions">

        <button
          type="button"
          class="secondary-button"
          data-modal-cancel
        >
          Close
        </button>

      </div>
    `,
  );
}

// ========================================================
// VIEW SUPERVISOR
// ========================================================

function openSupervisorModal(supervisor) {
  if (!supervisor) {
    return;
  }

  openModal(
    "Supervisor Details",
    "Supervisor information and assigned students.",
    `
      <div class="detail-grid">

        <div class="detail-item">

          <span>
            Full Name
          </span>

          <strong>
            ${escapeHTML(supervisor.name || "—")}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Email
          </span>

          <strong>
            ${escapeHTML(supervisor.email || "—")}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Department
          </span>

          <strong>
            ${escapeHTML(supervisor.department || "—")}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Students
          </span>

          <strong>
            ${escapeHTML(supervisor.studentCount ?? 0)}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Status
          </span>

          <strong>
            ${escapeHTML(capitalize(supervisor.status) || "—")}
          </strong>

        </div>

      </div>


      <div class="modal-actions">

        <button
          type="button"
          class="secondary-button"
          data-modal-cancel
        >
          Close
        </button>

      </div>
    `,
  );
}

// ========================================================
// VIEW INTERNSHIP
// ========================================================

function openInternshipModal(internship) {
  if (!internship) {
    return;
  }

  openModal(
    "Internship Placement",
    "Placement details and current status.",
    `
      <div class="detail-grid">

        <div class="detail-item">

          <span>
            Student
          </span>

          <strong>
            ${escapeHTML(internship.studentName || "—")}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Company
          </span>

          <strong>
            ${escapeHTML(internship.company || "—")}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Supervisor
          </span>

          <strong>
            ${escapeHTML(internship.supervisorName || "—")}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Status
          </span>

          <strong>
            ${escapeHTML(capitalize(internship.status) || "—")}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Start Date
          </span>

          <strong>
            ${formatDate(internship.startDate)}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            End Date
          </span>

          <strong>
            ${formatDate(internship.endDate)}
          </strong>

        </div>

      </div>


      <div class="modal-actions">

        <button
          type="button"
          class="secondary-button"
          data-modal-cancel
        >
          Close
        </button>

      </div>
    `,
  );
}

// ========================================================
// REVIEW LOG
// ========================================================

function openLogReviewModal(log) {
  if (!log) {
    return;
  }

  openModal(
    "Review Internship Log",
    "Review the student's submitted internship activity.",
    `
      <div class="review-note">

        Review this log carefully before
        approving or rejecting the submission.

      </div>


      <div class="detail-grid">

        <div class="detail-item">

          <span>
            Student
          </span>

          <strong>
            ${escapeHTML(log.studentName || "—")}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Date
          </span>

          <strong>
            ${formatDate(log.date)}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Supervisor
          </span>

          <strong>
            ${escapeHTML(log.supervisorName || "—")}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Current Status
          </span>

          <strong>
            ${escapeHTML(capitalize(log.status) || "—")}
          </strong>

        </div>


        <div class="detail-item full-width">

          <span>
            Activity
          </span>

          <strong>
            ${escapeHTML(log.activity || "—")}
          </strong>

        </div>

      </div>


      <div class="modal-actions">

        <button
          type="button"
          class="secondary-button"
          data-modal-cancel
        >
          Close
        </button>

        <button
          type="button"
          class="secondary-button"
          data-review-action="reject"
          data-log-id="${escapeHTML(log.id ?? "")}"
        >
          Reject
        </button>

        <button
          type="button"
          class="primary-button"
          data-review-action="approve"
          data-log-id="${escapeHTML(log.id ?? "")}"
        >
          Approve
        </button>

      </div>
    `,
  );
}

// ========================================================
// ADD BUTTONS
// ========================================================

const addStudentButton = getElement("addStudentButton");

const addSupervisorButton = getElement("addSupervisorButton");

const addInternshipButton = getElement("addInternshipButton");

if (addStudentButton) {
  addStudentButton.addEventListener("click", function () {
    openAddStudentModal();
  });














    
}

if (addSupervisorButton) {
  addSupervisorButton.addEventListener("click", function () {
    openAddSupervisorModal();
  });
}

if (addInternshipButton) {
  addInternshipButton.addEventListener("click", function () {
    openAddInternshipModal();
  });
}

// ========================================================
// EDIT ADMIN PROFILE
// ========================================================

const editAdminButton = getElement("editAdminButton");

if (editAdminButton) {
  editAdminButton.addEventListener("click", function () {
    openModal(
      "Edit Profile",
      "Update your administrator information.",
      `
          <form
            class="modal-form"
            id="adminEditForm"
          >

            <div class="modal-form-grid">

              <div class="form-group">

                <label for="adminName">
                  Full Name
                </label>

                <input
                  type="text"
                  id="adminName"
                  name="fullName"
                  value="${escapeHTML(adminState.profile.fullName)}"
                  required
                >

              </div>


              <div class="form-group">

                <label for="adminEmailInput">
                  Email Address
                </label>

                <input
                  type="email"
                  id="adminEmailInput"
                  name="email"
                  value="${escapeHTML(adminState.profile.email)}"
                  required
                >

              </div>


              <div class="form-group">

                <label for="adminPhoneInput">
                  Phone Number
                </label>

                <input
                  type="tel"
                  id="adminPhoneInput"
                  name="phone"
                  value="${escapeHTML(adminState.profile.phone)}"
                >

              </div>

            </div>


            <div class="modal-actions">

              <button
                type="button"
                class="secondary-button"
                data-modal-cancel
              >
                Cancel
              </button>

              <button
                type="submit"
                class="primary-button"
              >
                Save Changes
              </button>

            </div>

          </form>
        `,
    );
  });
}

// ========================================================
// GLOBAL MODAL FORM HANDLING
// ========================================================

document.addEventListener("submit", async function (event) {
  const form = event.target;

  if (!form || !form.id) {
    return;
  }

  if (form.id === "addStudentForm") {
    event.preventDefault();

    const data = {
        //username: document.getElementById("username").value,
        email: document.getElementById("newStudentEmail").value,
        //password: document.getElementById("password").value,
        student_id: document.getElementById("newStudentMatric").value,
        first_name: document.getElementById("newStudentfName").value,
        last_name: document.getElementById("newStudentlName").value,
        department: document.getElementById("newStudentDepartment").value,
        //level: document.getElementById("level").value,
        gender: document.getElementById("newStudentGender").value
    };

    const response = await fetch("/addStudent", {
        method: "POST",
        credentials: 'include',
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": getCookie("csrf_access_token")
        },
        body: JSON.stringify(data)
});
 
    const result = await response.json();
      
    if (!response.ok) {
           
            console.log(result);

            closeModal();
            alert(`The request failed. Error: ${response.status} \n Error Message: ${result.message}`);
            return;
        }
    
    console.log(result);

    closeModal();

    alert("Student added successfully.");
    window.location.reload()

    return;
  }

  if (form.id === "addSupervisorForm") {
    event.preventDefault();

     const data = {
        //username: document.getElementById("username").value,
        email: document.getElementById("newSupervisorEmail").value,
        //password: document.getElementById("password").value,
        first_name: document.getElementById("newSupervisorfName").value,
        last_name: document.getElementById("newSupervisorlName").value,
        department: document.getElementById("newSupervisorDepartment").value
        //level: document.getElementById("level").value,
    };

    const response = await fetch("/admin/supervisors", {
        method: "POST",
        credentials: 'include',
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": getCookie("csrf_access_token")
        },
        body: JSON.stringify(data)
});
    

    const result = await response.json();
    if (!response.ok) {
           
            console.log(result);

            closeModal();
            alert(`The request failed. Error: ${response.status} \n Error Message: ${result.message}`);
            return;
        }
      
    
    console.log(result);

    closeModal();

    alert("Supervisor added successfully.");

    return;
  }


  if (form.id === "adminEditForm") {
    event.preventDefault();

    const formData = new FormData(form);

    const fullName = String(formData.get("fullName") || "").trim();

    const email = String(formData.get("email") || "").trim();

    const phone = String(formData.get("phone") || "").trim();

    if (!fullName) {
      alert("Please enter your full name.");

      return;
    }

    if (!email) {
      alert("Please enter your email address.");

      return;
    }

    /*
      BACKEND READY POINT

      PUT /api/admin/profile

      Payload:

      {
        fullName,
        email,
        phone
      }

      */

    adminState.profile.fullName = fullName;

    adminState.profile.email = email;

    adminState.profile.phone = phone;

    renderAdminProfile();

    closeModal();

    alert("Profile changes saved successfully.");
  }
});

// ========================================================
// MODAL BUTTON HANDLING
// ========================================================

document.addEventListener("click", function (event) {
  const cancelButton = event.target.closest("[data-modal-cancel]");

  if (cancelButton) {
    closeModal();

    return;
  }

  const actionButton = event.target.closest("[data-action]");

  if (!actionButton) {
    return;
  }

  const action = actionButton.dataset.action;

  if (action === "view-student") {
    const id = actionButton.dataset.studentId;

    const student = adminState.students.find(function (item) {
      return String(item.id) === String(id);
    });

    if (student) {
      openStudentModal(student);
    }

    return;
  }

  if (action === "view-supervisor") {
    const id = actionButton.dataset.supervisorId;

    const supervisor = adminState.supervisors.find(function (item) {
      return String(item.id) === String(id);
    });

    if (supervisor) {
      openSupervisorModal(supervisor);
    }

    return;
  }

  if (action === "view-internship") {
    const id = actionButton.dataset.internshipId;

    const internship = adminState.internships.find(function (item) {
      return String(item.id) === String(id);
    });

    if (internship) {
      openInternshipModal(internship);
    }

    return;
  }

  if (action === "review-log") {
    const id = actionButton.dataset.logId;

    const log = adminState.logs.find(function (item) {
      return String(item.id) === String(id);
    });

    if (log) {
      openLogReviewModal(log);
    }
  }
});

// ========================================================
// LOG REVIEW ACTIONS
// ========================================================

document.addEventListener("click", function (event) {
  const button = event.target.closest("[data-review-action]");

  if (!button) {
    return;
  }

  const action = button.dataset.reviewAction;

  const logId = button.dataset.logId;

  const log = adminState.logs.find(function (item) {
    return String(item.id) === String(logId);
  });

  if (!log) {
    return;
  }

  if (action === "approve") {
    log.status = "approved";

    closeModal();

    renderLogs(adminState.logs);

    alert("Log approved successfully.");

    /*
      BACKEND READY POINT

      PUT /api/admin/logs/:id/review

      {
        status: "approved"
      }

      */

    return;
  }

  if (action === "reject") {
    log.status = "rejected";

    closeModal();

    renderLogs(adminState.logs);

    alert("Log rejected successfully.");

    /*
      BACKEND READY POINT

      PUT /api/admin/logs/:id/review

      {
        status: "rejected"
      }

      */
  }
});

// ========================================================
// LOGOUT
// ========================================================

const logoutButton = getElement("logoutButton");

if (logoutButton) {
  logoutButton.addEventListener("click", function (event) {
    event.preventDefault();

    const confirmed = window.confirm("Are you sure you want to logout?");

    if (!confirmed) {
      return;
    }

    /*
      BACKEND READY POINT

      POST /api/auth/logout

      On success:

      window.location.href =
        "login.html";
      */

    alert("Logout will be connected to the backend.");
  });
}

// ========================================================
// NOTIFICATIONS
// ========================================================

const notificationButton = getElement("notificationButton");

if (notificationButton) {
  notificationButton.addEventListener("click", function () {
    alert("No new notifications.");
  });
}

// ========================================================
// BACKEND DATA ENTRY POINTS
// ========================================================

function setDashboardData(data) {
  if (!data || typeof data !== "object") {
    return;
  }

  adminState.dashboard = {
    ...adminState.dashboard,

    ...data,
  };

  renderDashboardStats();
}

function setStudents(students) {
  if (!Array.isArray(students)) {
    return;
  }

  adminState.students = students;

  renderStudents(students);
}

function setSupervisors(supervisors) {
  if (!Array.isArray(supervisors)) {
    return;
  }

  adminState.supervisors = supervisors;

  renderSupervisors(supervisors);
}

function setInternships(internships) {
  if (!Array.isArray(internships)) {
    return;
  }

  adminState.internships = internships;

  renderInternships(internships);
}

function setLogs(logs) {
  if (!Array.isArray(logs)) {
    return;
  }

  adminState.logs = logs;

  renderLogs(logs);
}

function setAdminProfile(profile) {
  if (!profile || typeof profile !== "object") {
    return;
  }

  adminState.profile = {
    ...adminState.profile,

    ...profile,
  };

  renderAdminProfile();
}

// ========================================================
// INITIALIZE DASHBOARD
// ========================================================

function initializeDashboard() {
  renderDashboardStats();

  renderAdminProfile();

  
 
  renderInternships(adminState.internships);

 

  updatePageHeader(adminState.currentSection);
}

initializeDashboard();




