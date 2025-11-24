document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select (keep a default placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <div class="card-head">
            <h3 class="activity-title">${esc(name)}</h3>
            <span class="activity-count" title="Number of participants">${details.participants.length}</span>
          </div>
          <p class="activity-desc">${esc(details.description)}</p>
          <p class="activity-schedule"><strong>Schedule:</strong> ${esc(details.schedule)}</p>
              <section class="activity-participants">
                <h4 class="participants-heading">Participants</h4>
                ${participantsHtml(details.participants)}
              </section>
        `;

            // attach activity name for event delegation and updates
            activityCard.dataset.activityName = name;
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities UI so the newly signed-up participant appears
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  function participantsHtml(participants) {
    if (!participants || !participants.length) return '<div class="participants-empty">No participants yet</div>';

    return '<ul class="participants-list">' + participants.map(p => {
      // display escaped text, but store URL-encoded raw email in data attribute
      const disp = esc(p);
      const encoded = encodeURIComponent(p);
      return `<li><span class="participant-email">${disp}</span><button class="participant-remove" data-email="${encoded}" aria-label="Remove ${disp}">🗑️</button></li>`;
    }).join('') + '</ul>';
  }

  // Event delegation for participant remove buttons
  activitiesList.addEventListener('click', async (ev) => {
    const btn = ev.target.closest && ev.target.closest('.participant-remove');
    if (!btn) return;

    const encodedEmail = btn.getAttribute('data-email');
    const email = decodeURIComponent(encodedEmail || '');
    const card = btn.closest('.activity-card');
    const activityName = card && card.dataset && card.dataset.activityName;
    if (!activityName || !email) return;

    if (!confirm(`Unregister ${email} from ${activityName}?`)) return;

    try {
      const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
      const result = await resp.json();
      if (resp.ok) {
        // remove the list item from DOM
        const li = btn.closest('li');
        if (li) li.remove();

        // update count badge if present
        const countBadge = card.querySelector('.activity-count');
        if (countBadge) {
          const cur = parseInt(countBadge.textContent || '0', 10);
          countBadge.textContent = String(Math.max(0, cur - 1));
        }

        messageDiv.textContent = result.message || 'Unregistered';
        messageDiv.className = 'success';
      } else {
        messageDiv.textContent = result.detail || 'Failed to unregister';
        messageDiv.className = 'error';
      }
    } catch (err) {
      console.error('Error unregistering:', err);
      messageDiv.textContent = 'Failed to unregister. Please try again.';
      messageDiv.className = 'error';
    }

    messageDiv.classList.remove('hidden');
    setTimeout(() => messageDiv.classList.add('hidden'), 5000);
  });
});
