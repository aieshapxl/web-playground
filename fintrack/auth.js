// localStorage.clear()
const authForm = document.getElementById("authForm");
const switchAuth = document.getElementById("switchAuth");
const switchText = document.getElementById("switchText");
const authTitle = document.querySelector(".authTitle");
const authSubtitle = document.querySelector(".authSubtitle");
const authSubmit = document.getElementById("authSubmit");
const registerFields = document.querySelectorAll(".register-field");
const loginOnly = document.querySelector(".login-only");
const passwordToggle = document.getElementById("passwordToggle");
const passwordInput = document.getElementById("password");

let isRegistering = false;

switchAuth.addEventListener("click", () => {
  isRegistering = !isRegistering;

  registerFields.forEach((field) => {
    field.classList.toggle("hidden", !isRegistering);
  });

  loginOnly.classList.toggle("hidden", isRegistering);

  if (isRegistering) {
    authTitle.textContent = "Create your account";
    authSubtitle.textContent = "Start managing your finances today.";
    authSubmit.textContent = "Create Account";
    switchText.textContent = "Already have an account?";
    switchAuth.textContent = "Sign In";
  } else {
    authTitle.textContent = "Welcome Back";
    authSubtitle.textContent = "Sign in to continue to your account.";
    authSubmit.textContent = "Sign In";
    switchText.textContent = "Don't have an account?";
    switchAuth.textContent = "Create account";
  }
});

passwordToggle.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";

  passwordInput.type = isPassword ? "text" : "password";

  passwordToggle.innerHTML = `
    <span class="material-symbols-rounded">
      ${isPassword ? "visibility_off" : "visibility"}
    </span>
  `;
});

authForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value.trim();

  const users = JSON.parse(localStorage.getItem("fintrackUsers")) || [];

  if (isRegistering) {
    if (!name || !email || !password) {
      alert("Please fill in all fields.");
      return;
    }

    const existingUser = users.find((user) => user.email === email);

    if (existingUser) {
      alert("An account with this email already exists.");
      return;
    }

    const user = {
      name,
      email,
      password,
    };

    users.push(user);

    localStorage.setItem("fintrackUsers", JSON.stringify(users));

    localStorage.setItem("fintrackCurrentUser", JSON.stringify(user));

    localStorage.setItem("fintrackLoggedIn", "true");

    alert("Account created successfully.");

    window.location.href = "dashboard.html";
    return;
  }

  if (!email || !password) {
    alert("Please enter your email and password.");
    return;
  }

  const storedUser = users.find(
    (user) => user.email === email && user.password === password,
  );

  if (!storedUser) {
    alert("Invalid email or password.");
    return;
  }

  localStorage.setItem("fintrackCurrentUser", JSON.stringify(storedUser));

  localStorage.setItem("fintrackLoggedIn", "true");

  window.location.href = "dashboard.html";
});
