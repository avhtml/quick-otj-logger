document.addEventListener('DOMContentLoaded', () => {
  const dateDisplay = document.getElementById('dateDisplay');
  const calGrid = document.getElementById('calGrid');
  const monthYear = document.getElementById('monthYear');
  const submitBtn = document.getElementById('submitBtn');
  const hoursInput = document.getElementById('hours');
  const minutesInput = document.getElementById('minutes');
  const notesInput = document.getElementById('notes');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); 
  
  let currentMonth = today.getMonth();
  let currentYear = today.getFullYear();
  let selectedDate = new Date(today);

  // --- Real-time Validation Logic ---
  const validateForm = () => {
    const hours = parseInt(hoursInput.value) || 0;
    const minutes = parseInt(minutesInput.value) || 0;
    const totalMinutes = (hours * 60) + minutes;
    
    // Disable button if time is less than 1 minute
    if (totalMinutes < 1) {
      submitBtn.disabled = true;
    } else {
      submitBtn.disabled = false;
    }
  };

  // Listen for changes on the time inputs to toggle the button
  hoursInput.addEventListener('input', validateForm);
  minutesInput.addEventListener('input', validateForm);
  
  // Run once on load to ensure the button starts disabled (since default is 0:00)
  validateForm();

  // --- Calendar Logic ---
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatDisplay = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${d}/${m}/${y}`;
  };

  dateDisplay.value = formatDisplay(selectedDate);
  renderCalendar(currentMonth, currentYear);

  function renderCalendar(month, year) {
    calGrid.innerHTML = '';
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const offset = (firstDayIndex + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    monthYear.textContent = `${monthNames[month]} ${year}`;

    const dayNames = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    dayNames.forEach(day => {
      const el = document.createElement('div');
      el.textContent = day;
      el.className = 'cal-day-name';
      calGrid.appendChild(el);
    });

    for (let i = 0; i < offset; i++) {
      calGrid.appendChild(document.createElement('div'));
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dayEl = document.createElement('div');
      dayEl.textContent = i;
      dayEl.className = 'cal-day';
      
      const cellDate = new Date(year, month, i);
      
      if (cellDate > today) {
        dayEl.classList.add('disabled');
      } else {
        dayEl.addEventListener('click', () => {
          selectedDate = new Date(year, month, i);
          dateDisplay.value = formatDisplay(selectedDate);
          renderCalendar(currentMonth, currentYear);
        });
      }

      if (cellDate.getTime() === selectedDate.getTime()) {
        dayEl.classList.add('selected');
      }

      calGrid.appendChild(dayEl);
    }
  }

  document.getElementById('prevMonth').addEventListener('click', (e) => {
    e.preventDefault();
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar(currentMonth, currentYear);
  });

  document.getElementById('nextMonth').addEventListener('click', (e) => {
    e.preventDefault();
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar(currentMonth, currentYear);
  });

  // --- Submission Logic ---
  const setButtonState = (text, className) => {
    const originalText = "Save off the job entry";
    submitBtn.textContent = text;
    submitBtn.className = `primary-btn ${className}`;
    submitBtn.disabled = true;
    
    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.className = 'primary-btn';
      // Re-run validation so it returns to 0.6 opacity if inputs were reset to 0
      validateForm(); 
    }, 2500);
  };

  submitBtn.addEventListener('click', async () => {
    if (submitBtn.disabled) return;

    const notes = notesInput.value;
    const categoryId = document.getElementById('category').value;
    const apiDateString = formatDate(selectedDate);
    const hours = parseInt(hoursInput.value) || 0;
    const minutes = parseInt(minutesInput.value) || 0;
    const totalMinutes = (hours * 60) + minutes;

    if (!notes) {
      setButtonState("Please enter a task", "error");
      return;
    }

    if (selectedDate > today) {
      setButtonState("Cannot log future date", "error");
      return;
    }

    submitBtn.textContent = "Logging...";
    submitBtn.disabled = true;

    try {
      const cookie = await chrome.cookies.get({ url: 'https://otj.multiverse.io', name: '__Host-csrf-token' });
      if (!cookie) {
        setButtonState("Please log into Multiverse", "error");
        return;
      }

      const payload = {
        "0": {
          "json": {
            "notes": notes,
            "categoryId": categoryId,
            "entries": [{ "date": apiDateString, "minutes": totalMinutes }]
          }
        }
      };

      const response = await fetch('https://otj.multiverse.io/trpc/otjLogs.createLogs?batch=1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': cookie.value
        },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (response.ok) {
        setButtonState("Success! Time logged.", "success");
        // Reset form fields after success
        notesInput.value = '';
        hoursInput.value = '0';
        minutesInput.value = '0';
      } else {
        throw new Error("Failed to log time");
      }
    } catch (error) {
      setButtonState("An error occurred", "error");
    }
  });
});