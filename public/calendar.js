// calendar.js

let calendar;
const API_BASE = "https://task-scheduler-i90m.onrender.com"; // 👈 Render backend

// parse userId reliably
const userId = localStorage.getItem("userId");

if (!userId) {
  alert("⚠️ Please log in first!");
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
    events: [] // will be filled from DB
  });

  calendar.render();

  // Load existing tasks from DB
  loadTasks();

  // Handle task form submission
  const taskForm = document.getElementById("taskForm");
  const submitBtn = taskForm.querySelector('button[type="submit"]');

  taskForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    const date = document.getElementById("taskDate").value;
    const time = document.getElementById("taskTime").value;
    const name = document.getElementById("taskName").value?.trim();

    if (!date) return alert("Please select a date.");
    if (!time) return alert("Please select a time.");
    if (!name) return alert("Please enter a task name.");

    const eventDateTime = `${date}T${time}:00`;

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving...";

      const res = await fetch(`${API_BASE}/tasks`, {   // 👈 updated
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, dateTime: eventDateTime, userId })
      });

      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Server returned ${res.status}`);
      }

      let result;
      if (contentType.includes("application/json")) {
        result = await res.json();
      } else {
        result = { message: await res.text() };
      }

      alert(result.message || "Task saved");

      // Refresh tasks after saving
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
    const res = await fetch(`${API_BASE}/tasks/${userId}`);   // 👈 updated

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Server returned ${res.status}`);
    }

    const tasks = await res.json();

    calendar.getEvents().forEach(ev => ev.remove());

    tasks.forEach(task => {
      const title = task.name || task.Name || "Task";
      const start = task.dateTime || task.DateTime || task.Start || null;

      if (!start) return;

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
