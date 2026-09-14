document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // NAVIGATION
    // ==========================================

    const navLinks = document.querySelectorAll(".nav-link[data-section]");
    const sections = document.querySelectorAll(".page-section");
    const pageTitle = document.querySelector(".page-title h1");

    navLinks.forEach(link => {

        link.addEventListener("click", (e) => {

            e.preventDefault();

            const sectionName = link.dataset.section;

            // Remove active from all sidebar links
            navLinks.forEach(item => {
                item.classList.remove("active");
            });

            // Add active to clicked sidebar link
            link.classList.add("active");

            // Hide all sections
            sections.forEach(section => {
                section.classList.remove("active-section");
            });

            // Show selected section
            const selectedSection =
                document.getElementById(sectionName);

            if (selectedSection) {
                selectedSection.classList.add("active-section");
            }

            // Update page title
            const titles = {
                dashboard: "Dashboard",
                profile: "My Profile",
                internship: "Internship",
                logbook: "Logbook"
            };

            if (pageTitle) {
                pageTitle.textContent =
                    titles[sectionName] || "Dashboard";
            }

        });

    });


    // ==========================================
    // DASHBOARD BUTTONS
    // ==========================================

    const sectionButtons =
        document.querySelectorAll("[data-section-button]");

    sectionButtons.forEach(button => {

        button.addEventListener("click", () => {

            const sectionName =
                button.dataset.sectionButton;

            const targetNav =
                document.querySelector(
                    `.nav-link[data-section="${sectionName}"]`
                );

            if (targetNav) {
                targetNav.click();
            }

        });

    });


    // ==========================================
    // DAILY LOG MODAL
    // ==========================================

    const addLogButton =
        document.getElementById("addLogButton");

    const logModal =
        document.getElementById("logModal");

    const closeLogModal =
        document.getElementById("closeLogModal");

    const cancelLogModal =
        document.getElementById("cancelLogModal");


    function openLogModal() {

        if (logModal) {
            logModal.classList.add("show");
        }

    }

    function getCookie(name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : null;
}
    function closeLog() {

        if (logModal) {
            logModal.classList.remove("show");
        }

    }


    if (addLogButton) {
        addLogButton.addEventListener(
            "click",
            openLogModal
        );
    }


    if (closeLogModal) {
        closeLogModal.addEventListener(
            "click",
            closeLog
        );
    }


    if (cancelLogModal) {
        cancelLogModal.addEventListener(
            "click",
            closeLog
        );
    }


    // Close modal when clicking outside
    if (logModal) {

        logModal.addEventListener("click", (e) => {

            if (e.target === logModal) {
                closeLog();
            }

        });

    }


    // ==========================================
    // DAILY LOG FORM
    // ==========================================

    const logForm =
        document.getElementById("logForm");

    let dailyLogs = [];


    if (logForm) {

        logForm.addEventListener("submit", async (e) => {

            e.preventDefault();

            const date =
                document.getElementById("logDate")?.value;
                 
            const activity =
                document.getElementById("activity")?.value.trim();

            const skills =
                document.getElementById("skills")?.value.trim();

            const challenges =
                document.getElementById("challenges")?.value.trim();


            if (!date || !activity || !skills) {

                alert(
                    "Please fill in all required fields."
                );

                return;
            }


            const newLog = {

                id: Date.now(),

                date: date,

                activity: activity,

                skills: skills,

                challenges: challenges || "None",

                status: "Pending"

            };


            const response =  await fetch("/student/logs", {
             method: "POST",
             credentials: 'include',
             headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": getCookie("csrf_access_token")
            },
        
                
                body: JSON.stringify(newLog)
                
            });

            const result = await response.json();

            console.log(result);
            if (!response.ok) {
           
                    console.log(result);
                    closeLog();
                    logForm.reset();
                    alert(`The request failed. Error: ${response.status} \n Error Message: ${result.message}`);
                    
                    return;
        }

            closeLog();

            logForm.reset();


            alert(
                "Daily log submitted successfully."
            );
            window.location.reload();
            return

        });

    }


    

    // ==========================================
    // DASHBOARD STATISTICS
    // ==========================================

    function updateDashboardStats() {

        const submittedElement =
            document.getElementById(
                "submittedLogsCount"
            );

        const approvedElement =
            document.getElementById(
                "approvedLogsCount"
            );

        const pendingElement =
            document.getElementById(
                "pendingLogsCount"
            );


        const submitted =
            dailyLogs.length;


        const approved =
            dailyLogs.filter(
                log =>
                    log.status.toLowerCase() ===
                    "approved"
            ).length;


        const pending =
            dailyLogs.filter(
                log =>
                    log.status.toLowerCase() ===
                    "pending"
            ).length;


        if (submittedElement) {
            submittedElement.textContent =
                submitted;
        }


        if (approvedElement) {
            approvedElement.textContent =
                approved;
        }


        if (pendingElement) {
            pendingElement.textContent =
                pending;
        }

    }


    // ==========================================
    // INTERNSHIP MODAL
    // ==========================================

    const addInternshipButton =
        document.getElementById(
            "addInternshipButton"
        );

    const intModal =
        document.getElementById("intModal");

    const closeIntModal =
        document.getElementById(
            "closeIntModal"
        );

    const cancelInternshipModal =
        document.getElementById(
            "cancelInternshipModal"
        );


    function openInternshipModal() {

        if (intModal) {
            intModal.classList.add("show");
        }

    }


    function closeInternshipModal() {

        if (intModal) {
            intModal.classList.remove("show");
        }

    }


    if (addInternshipButton) {

        addInternshipButton.addEventListener(
            "click",
            openInternshipModal
        );

    }


    if (closeIntModal) {

        closeIntModal.addEventListener(
            "click",
            closeInternshipModal
        );

    }


    if (cancelInternshipModal) {

        cancelInternshipModal.addEventListener(
            "click",
            closeInternshipModal
        );

    }


    // Close internship modal outside click
    if (intModal) {

        intModal.addEventListener("click", (e) => {

            if (e.target === intModal) {
                closeInternshipModal();
            }

        });

    }


    // ==========================================
    // INTERNSHIP FORM
    // ==========================================

    const internshipForm =
        document.getElementById(
            "internshipForm"
        );

    let internshipData = null;


    if (internshipForm) {

        internshipForm.addEventListener(
            "submit",
            async (e) => {

                e.preventDefault();

                const company =
                    document.getElementById(
                        "newInternshipCompany"
                    )?.value.trim();

              const companyAddress =
                    document.getElementById(
                        "newInternshipCompanyAddress"
                    )?.value.trim();
             const companyPhoneNo = document.getElementById("newInternshipCompanyPhoneNo")?.value.trim();
                const companyEmail = document.getElementById("newInternshipCompanyEmail")?.value.trim();


                const startDate =
                    document.getElementById(
                        "newInternshipStart"
                    )?.value;


                const endDate =
                    document.getElementById(
                        "newInternshipEnd"
                    )?.value;

                const status = "pending"


                if (
                    
                    !company ||
                    !companyAddress ||
                    !companyPhoneNo ||
                    !companyEmail ||
                    !status ||
                    !startDate ||
                    !endDate
                ) {

                    alert(
                        "Please fill in all internship fields."
                    );

                    return;
                }


                internshipData = {


                    company,

                    companyAddress,

                    status,

                    companyPhoneNo,

                    companyEmail,

                    startDate,

                    endDate

                };

                const response =  await fetch("/student/placements", {
                     method: "POST",
                    credentials: 'include',
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": getCookie("csrf_access_token")
                    },
                
                    body: JSON.stringify(internshipData)
                
                });

                const result = await response.json();

                console.log(result);

               // renderInternship();


                 if (!response.ok) {
           
                    console.log(result);

                    closeInternshipModal();
                     internshipForm.reset()
                    alert(`The request failed. Error: ${response.status} \n Error Message: ${result.message}`);
                    return;
        }
                closeInternshipModal();

                internshipForm.reset();


                alert(
                    "Internship information saved successfully."
                );
                window.location.reload();  

                return

            }
        );

    }



    // ==========================================
    // PROFILE EDITING
    // ==========================================

    const editProfileButton =
        document.getElementById(
            "editProfileButton"
        );

    const profileEditSection =
        document.getElementById(
            "profileEditSection"
        );

    const cancelProfileEdit =
        document.getElementById(
            "cancelProfileEdit"
        );

    const profileEditForm =
        document.getElementById(
            "profileEditForm"
        );


    if (editProfileButton) {

        editProfileButton.addEventListener(
            "click",
            () => {

                if (profileEditSection) {
                    profileEditSection.classList.add(
                        "show"
                    );
                }
                const modal = document.getElementById('profileEditSection'); 
  modal.scrollIntoView({ behavior: 'smooth', block: 'center' });


                const currentName =
                    document.getElementById(
                        "profileFullName"
                    )?.textContent.trim() || "";


                const currentEmail =
                    document.getElementById(
                        "profileEmail"
                    )?.textContent.trim() || "";


                const currentPhone =
                    document.getElementById(
                        "profilePhone"
                    )?.textContent.trim() || "";


                const currentAddress =
                    document.getElementById(
                        "profileAddress"
                    )?.textContent.trim() || "";


                document.getElementById(
                    "profileName"
                ).value = currentName === "—"
                    ? ""
                    : currentName;


                document.getElementById(
                    "profileEmailInput"
                ).value = currentEmail === "—"
                    ? ""
                    : currentEmail;


                document.getElementById(
                    "profilePhoneInput"
                ).value = currentPhone === "—"
                    ? ""
                    : currentPhone;


                document.getElementById(
                    "profileAddressInput"
                ).value = currentAddress === "—"
                    ? ""
                    : currentAddress;

            }
        );

    }


    if (cancelProfileEdit) {

        cancelProfileEdit.addEventListener(
            "click",
            () => {

                if (profileEditSection) {
                    profileEditSection.classList.remove(
                        "show"
                    );
                }

            }
        );

    }


    // ==========================================
    // SAVE PROFILE
    // ==========================================

    if (profileEditForm) {

        profileEditForm.addEventListener(
            "submit",
            async (e) => {

                e.preventDefault();


                


                const phone =
                    document.getElementById(
                        "profilePhoneInput"
                    )?.value.trim();


                const address =
                    document.getElementById(
                        "profileAddressInput"
                    )?.value.trim();


                

;


                document.getElementById(
                    "profilePhone"
                ).textContent =
                    phone || "Not provided";


                document.getElementById(
                    "profileAddress"
                ).textContent =
                    address || "Not provided";


                // Update topbar

                const studentTopbarName =
                    document.getElementById(
                        "studentTopbarName"
                    );

                if (studentTopbarName) {
                    studentTopbarName.textContent =
                        name;
                }


                // Update first name

                const studentFirstName =
                    document.getElementById(
                        "studentFirstName"
                    );

                if (studentFirstName) {

                    studentFirstName.textContent =
                        name.split(" ")[0];

                }


                // Update avatar

                const studentAvatar =
                    document.getElementById(
                        "studentAvatar"
                    );

                if (studentAvatar) {

                    studentAvatar.textContent =
                        getInitials(name);

                }


                if (profileEditSection) {

                    profileEditSection.classList.remove(
                        "show"
                    );

                }

               data = {phone: phone, 
                       address: address}
               const response =  await fetch("/student/profile", {
                    method: "PUT",
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
                    alert(`The request failed. Error: ${response.status} \n Error Message: ${result.message}`);
                    return;
        }

            console.log(result);

            


            alert(
                "Information updated."
            );
                window.location.reload();
            return

            }
        );

    }


    // ==========================================
    // GET INITIALS
    // ==========================================

    function getInitials(name) {

        if (!name) return "--";


        const parts =
            name.trim().split(/\s+/);


        if (parts.length === 1) {

            return parts[0]
                .substring(0, 2)
                .toUpperCase();

        }


        return (
            parts[0][0] +
            parts[parts.length - 1][0]
        ).toUpperCase();

    }


    // ==========================================
    // ESCAPE HTML
    // ==========================================

    function escapeHTML(value) {

        const div =
            document.createElement("div");

        div.textContent = value;

        return div.innerHTML;

    }


    // ==========================================
    // INITIALIZE
    // ==========================================

    renderDailyLogs();

    updateDashboardStats();

});


 