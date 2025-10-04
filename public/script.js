const API_BASE = "https://task-scheduler-i90m.onrender.com"; // 👈 Render backend URL

// Toggle between Sign In and Sign Up
document.getElementById("signup-link").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("signinForm").style.display = "none";
  document.getElementById("registerForm").style.display = "block";
});

document.getElementById("signin-link").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("registerForm").style.display = "none";
  document.getElementById("signinForm").style.display = "block";
});


// ✅ Send OTP
document.getElementById("sendOtpBtn").addEventListener("click", async () => {
  const email = document.getElementById("signup-email").value;

  if (!email) {
    alert("⚠️ Please enter your email first.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/send-otp`, {   // 👈 updated
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const result = await response.json();
    alert(result.message);
  } catch (err) {
    console.error("❌ OTP Send Error:", err);
    alert("Failed to send OTP!");
  }
});


// ✅ Verify OTP
document.getElementById("verifyOtpBtn").addEventListener("click", async () => {
  const email = document.getElementById("signup-email").value;
  const otp = document.getElementById("signup-otp").value;

  if (!otp) {
    alert("⚠️ Please enter the OTP.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/verify-otp`, {   // 👈 updated
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp })
    });

    const result = await response.json();
    alert(result.message);

    if (response.ok) {
      document.getElementById("otpVerified").value = "true"; // hidden flag
    }
  } catch (err) {
    console.error("❌ OTP Verify Error:", err);
    alert("OTP verification failed!");
  }
});


// ✅ Handle Signup (only if OTP verified)
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (document.getElementById("otpVerified").value !== "true") {
    alert("⚠️ Please verify your email OTP first!");
    return;
  }

  const formData = {
    firstName: document.getElementById("first-name").value,
    lastName: document.getElementById("last-name").value,
    dob: document.getElementById("dob").value,
    email: document.getElementById("signup-email").value,
    username: document.getElementById("signup-username").value,
    password: document.getElementById("signup-password").value
  };

  try {
    const response = await fetch(`${API_BASE}/signup`, {   // 👈 updated
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    const result = await response.json();
    alert(result.message);

    if (response.ok) {
      document.getElementById("registerForm").reset();
      document.getElementById("registerForm").style.display = "none";
      document.getElementById("signinForm").style.display = "block";
    }
  } catch (err) {
    console.error("❌ Signup Error:", err);
    alert("Signup failed!");
  }
});


// ✅ Handle Signin
document.getElementById("signinForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const creds = {
    username: document.getElementById("signin-username").value,
    password: document.getElementById("signin-password").value
  };

  try {
    const response = await fetch(`${API_BASE}/signin`, {   // 👈 updated
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds)
    });

    const result = await response.json();

    if (response.ok) {
      localStorage.setItem("userId", result.userId);
      window.location.href = "calendar.html";
    } else {
      alert(result.message);
    }

  } catch (err) {
    console.error("❌ Signin Error:", err);
    alert("Signin failed!");
  }
});
