const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("passwordToggle");
const loginForm = document.getElementById("loginForm");

passwordToggle.addEventListener("click", function () {
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    passwordToggle.textContent = "Hide";
  } else {
    passwordInput.type = "password";
    passwordToggle.textContent = "Show";
  }
});

loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Please fill out all fields.");
        return;
    }

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.message || "Login failed.");
            return;
        }

        // Get information returned by Flask
        const role = result.role;

        // Store JWT
        localStorage.setItem("role", role);

        // Redirect based on role
        if (role === "student") {
            window.location.href = "/student";
        } 
        else if (role === "supervisor") {
            window.location.href = "/supervisor";
        } 
        else if (role === "admin") {
            window.location.href = "/admin";
        } 
        else {
            localStorage.removeItem("token");
            localStorage.removeItem("role");

            alert("Unknown user role.");
        }

    } catch (error) {
        console.error(error);
        alert("Unable to connect to the server.");
    }
});


    
 