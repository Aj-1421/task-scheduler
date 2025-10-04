// calendar.js

let calendar;

// parse userId reliably (handle NaN, null, "0" etc.)
const userId = localStorage.getItem("userId");

if (!userId) {
  alert("⚠️ Please log in first!");
  // ensure no trailing spaces
  window.location.href = "signinPage.html";
}

document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("calendar");

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay"
    },
    dateClick: function(info) {
      document.getElementById("taskDate").value = info.dateStr;
      document.getElementById("taskModal").style.display = "block";
    },
    events: [] // filled from DB
  });

  calendar.render();

  // Load existing tasks from DB
  loadTasks();

  // Handle task form submission
  const taskForm = document.getElementById("taskForm");
  const submitBtn = taskForm.querySelector('button[type="submit"]');

  taskForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    // simple validation
    const date = document.getElementById("taskDate").value;
    const time = document.getElementById("taskTime").value;
    const name = document.getElementById("taskName").value?.trim();

    if (!date) return alert("Please select a date.");
    if (!time) return alert("Please select a time.");
    if (!name) return alert("Please enter a task name.");

    // Build local date-time string (no 'Z') so server receives local datetime:
    // e.g. "2025-09-23T14:30:00"
    const eventDateTime = `${date}T${time}:00`;

    try {
      // disable button to prevent double submit
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving...";

      const res = await fetch("http://localhost:5000/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, dateTime: eventDateTime, userId })
      });

      // If server returned non-JSON (HTML error), read text and throw it for better debugging.
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Server returned ${res.status}`);
      }

      // Parse JSON only if JSON is returned
      let result;
      if (contentType.includes("application/json")) {
        result = await res.json();
      } else {
        // fallback: try text
        result = { message: await res.text() };
      }

      alert(result.message || "Task saved");

      // Refresh tasks from DB (safer than only updating UI)
      await loadTasks();

      closeModal();
      taskForm.reset();
    } catch (err) {
      console.error("❌ Error saving task:", err);
      alert("Failed to save task: " + (err.message || err));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Save";
    }
  });
});

// Load tasks and add to calendar
async function loadTasks() {
  try {
    const res = await fetch(`http://localhost:5000/tasks/${userId}`);

    // handle non-ok responses
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Server returned ${res.status}`);
    }

    const tasks = await res.json();

    // remove existing events
    calendar.getEvents().forEach(ev => ev.remove());

    // Add tasks to calendar
    tasks.forEach(task => {
      // Task fields may differ based on DB column names; adjust if needed
      const title = task.Name || task.name || "Task";
      const start = task.DateTime || task.dateTime || task.Start || null;

      if (!start) return;

      // If database returns SQL datetime without timezone, FullCalendar will
      // treat it as local if no Z is present. If your DB returns UTC ISO strings
      // with 'Z', FullCalendar will render correctly in local timezone.
      calendar.addEvent({
        title,
        start
      });
    });
  } catch (err) {
    console.error("❌ Error loading tasks:", err);
  }
}

function closeModal() {
  document.getElementById("taskModal").style.display = "none";
}

function logout() {
  localStorage.removeItem("userId");
  window.location.href = "signinPage.html";
}
