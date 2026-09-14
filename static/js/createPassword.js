//const matricNumberInput = document.getElementById("matricNumber");
const emailInput = document.getElementById("email");

const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

const passwordToggle = document.getElementById("passwordToggle");
const confirmPasswordToggle = document.getElementById("confirmPasswordToggle");

const createPasswordForm = document.getElementById("createPasswordForm");
const activation_codeInput = document.getElementById("activation_code");


// ----------------------------------------------------
// SHOW / HIDE PASSWORD
// ----------------------------------------------------

passwordToggle.addEventListener("click", function () {

    if (passwordInput.type === "password") {

        passwordInput.type = "text";
        passwordToggle.textContent = "Hide";

    } else {

        passwordInput.type = "password";
        passwordToggle.textContent = "Show";

    }

});


// ----------------------------------------------------
// SHOW / HIDE CONFIRM PASSWORD
// ----------------------------------------------------

confirmPasswordToggle.addEventListener("click", function () {

    if (confirmPasswordInput.type === "password") {

        confirmPasswordInput.type = "text";
        confirmPasswordToggle.textContent = "Hide";

    } else {

        confirmPasswordInput.type = "password";
        confirmPasswordToggle.textContent = "Show";

    }

});


// ----------------------------------------------------
// CREATE PASSWORD FORM
// ----------------------------------------------------

createPasswordForm.addEventListener("submit", async function (e) {

    e.preventDefault();


    // ------------------------------------------------
    // GET FORM VALUES
    // ------------------------------------------------

    //const studentId = matricNumberInput.value.trim();

    const email = emailInput.value.trim().toLowerCase();

    const password = passwordInput.value;

    const confirmPassword = confirmPasswordInput.value;
    const activation_code = activation_codeInput.value


    // ------------------------------------------------
    // CHECK EMPTY FIELDS
    // ------------------------------------------------

    if (
        !activation_code||
        !email ||
        !password ||
        !confirmPassword
    ) {

        alert("Please fill out all fields.");
        return;

    }


    // ------------------------------------------------
    // CHECK PASSWORD MATCH
    // ------------------------------------------------

    if (password !== confirmPassword) {

        alert("Passwords do not match.");
        return;

    }


    // ------------------------------------------------
    // SEND REQUEST TO FLASK
    // ------------------------------------------------

    try {

        const response = await fetch("/create-password", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                //student_id: studentId,
                email: email,
                password: password,
                confirm_password: confirmPassword,
                activation_code: activation_code

            })

        });


        // Convert Flask response to JSON

        const result = await response.json();


        // ------------------------------------------------
        // HANDLE SERVER ERROR
        // ------------------------------------------------

        if (!response.ok) {

            alert(
                result.message || "Unable to create password."
            );

            return;

        }


        // ------------------------------------------------
        // SUCCESS
        // ------------------------------------------------

        alert(
            result.message ||
            "Password created successfully."
        );


        // Redirect to login page

        window.location.href = "/";


    } catch (error) {

        console.error(error);

        alert(
            "Unable to connect to the server."
        );

    }

});