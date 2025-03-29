document.addEventListener('DOMContentLoaded', () => {
    // --- Existing Elements ---
    const newStaffNameInput = document.getElementById('newStaffName');
    const addStaffBtn = document.getElementById('addStaffBtn');
    const staffListUl = document.getElementById('staffList');
    const attendanceLogBody = document.getElementById('attendanceLogBody');
    const refreshLogBtn = document.getElementById('refreshLogBtn');
    const clearLogBtn = document.getElementById('clearLogBtn');

    // --- New Timesheet Elements ---
    const weekSelector = document.getElementById('weekSelector');
    const timesheetSummaryBody = document.getElementById('timesheetSummaryBody');

    // --- Local Storage Keys ---
    const STAFF_LIST_KEY = 'staffList';
    const ATTENDANCE_LOG_KEY = 'attendanceLog';

    // ==========================================================
    // --- Local Storage Helpers (Keep existing functions) ---
    // ==========================================================
    function getLocalStorageItem(key, defaultValue = []) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error reading ${key} from localStorage:`, error);
            alert(`Error reading ${key} from localStorage.`);
            return defaultValue;
        }
    }

    function setLocalStorageItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Error writing ${key} to localStorage:`, error);
            alert(`Error writing ${key} to localStorage. It might be full or disabled.`);
        }
    }

    // ==========================================================
    // --- Staff Management (Keep existing functions) ---
    // ==========================================================
    function displayStaffList() {
        const staffNames = getLocalStorageItem(STAFF_LIST_KEY);
        staffListUl.innerHTML = ''; // Clear current list

        if (staffNames.length === 0) {
            staffListUl.innerHTML = '<li>No staff members added yet.</li>';
            return;
        }

        staffNames.forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.classList.add('danger-btn');
            removeBtn.addEventListener('click', () => removeStaff(name));
            li.appendChild(removeBtn);
            staffListUl.appendChild(li);
        });
    }

    function addStaff() {
        const newName = newStaffNameInput.value.trim();
        if (!newName) {
            alert('Please enter a staff name.'); return;
        }
        const staffNames = getLocalStorageItem(STAFF_LIST_KEY);
        if (staffNames.includes(newName)) {
            alert(`${newName} is already in the list.`); return;
        }
        staffNames.push(newName);
        setLocalStorageItem(STAFF_LIST_KEY, staffNames);
        newStaffNameInput.value = '';
        displayStaffList();
        alert(`${newName} added successfully.`);
        // Also refresh week selector as new staff might need to appear in summary
        populateWeekSelector();
    }

    function removeStaff(nameToRemove) {
        if (!confirm(`Are you sure you want to remove ${nameToRemove}?`)) return;
        let staffNames = getLocalStorageItem(STAFF_LIST_KEY);
        staffNames = staffNames.filter(name => name !== nameToRemove);
        setLocalStorageItem(STAFF_LIST_KEY, staffNames);
        displayStaffList();
        alert(`${nameToRemove} removed successfully.`);
         // Also refresh week selector and potentially the current summary
        populateWeekSelector();
    }

    // ==========================================================
    // --- Attendance Log Display (Keep existing function) ---
    // ==========================================================
    function displayAttendanceLog() {
        const attendanceLog = getLocalStorageItem(ATTENDANCE_LOG_KEY);
        attendanceLogBody.innerHTML = '';

        if (attendanceLog.length === 0) {
             const row = attendanceLogBody.insertRow();
             const cell = row.insertCell(); cell.colSpan = 3;
             cell.textContent = 'No attendance records found in this browser\'s local storage.';
             cell.style.textAlign = 'center';
            return;
        }
        // Sort by timestamp descending (most recent first) for display
        attendanceLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        attendanceLog.forEach(entry => {
            const row = attendanceLogBody.insertRow();
            const timestampCell = row.insertCell();
            const nameCell = row.insertCell();
            const actionCell = row.insertCell();
            timestampCell.textContent = new Date(entry.timestamp).toLocaleString();
            nameCell.textContent = entry.name;
            actionCell.textContent = entry.action;
            actionCell.style.color = entry.action === 'signin' ? 'green' : (entry.action === 'signout' ? 'orange' : '');
        });
    }

     function clearAttendanceLog() {
        if (!confirm('Are you SURE you want to clear the ENTIRE attendance log stored in THIS browser? This cannot be undone.')) {
            return;
        }
        setLocalStorageItem(ATTENDANCE_LOG_KEY, []); // Set to empty array
        displayAttendanceLog(); // Refresh display
        alert('Attendance log cleared for this browser.');
        // Also refresh timesheet data
        populateWeekSelector();
        displayWeeklyTimesheet(''); // Clear summary table
    }


    // ==========================================================
    // --- NEW: Timesheet Calculation and Display Logic ---
    // ==========================================================

    /**
     * Helper to format milliseconds into decimal hours (e.g., 1.50)
     */
    function msToDecimalHours(ms) {
        if (!ms || ms <= 0) return 0;
        return ms / (1000 * 60 * 60);
    }

    /**
     * Helper to format hours to 2 decimal places
     */
    function formatHours(hours) {
       return hours.toFixed(2);
    }

    /**
     * Helper to get YYYY-MM-DD string from a Date object
     */
    // NEW FUNCTION - Use this instead
    /**
     * Helper to get YYYY-MM-DD string from a Date object based on its LOCAL year, month, and day.
     */
    function formatDateISO(date) {
        if (!(date instanceof Date) || isNaN(date)) {
            // Handle invalid date inputs if necessary
            console.error("Invalid date passed to formatDateISO_Local:", date);
            // Decide on fallback behavior, e.g., return null or an empty string
            return null;
        }
        const year = date.getFullYear();
        // getMonth() is 0-indexed (0=Jan, 1=Feb, etc.), so add 1
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Helper to get the start of the week (Monday) for a given date.
     */
    function getStartOfWeek(date) {
        const dt = new Date(date.getTime()); // Clone date
        const dayOfWeek = dt.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6
        const diff = dt.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
        return new Date(dt.setDate(diff));
    }

    /**
     * Calculates daily work durations in milliseconds for all users from the log.
     * Returns an object: { 'YYYY-MM-DD': { 'UserName': totalMillis, ... }, ... }
     */
    function calculateDailyDurations() {
        const attendanceLog = getLocalStorageItem(ATTENDANCE_LOG_KEY);
        // Sort chronologically for correct pairing
        attendanceLog.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        const dailyTotals = {}; // { 'YYYY-MM-DD': { 'UserName': totalMillis } }
        const openSessions = {}; // { 'UserName': signInTimestamp }

        for (const entry of attendanceLog) {
            const entryDate = new Date(entry.timestamp);
            const entryDayStr = formatDateISO(entryDate);
            const userName = entry.name;

            if (!dailyTotals[entryDayStr]) {
                dailyTotals[entryDayStr] = {};
            }
            if (!dailyTotals[entryDayStr][userName]) {
                dailyTotals[entryDayStr][userName] = 0;
            }

            if (entry.action === 'signin') {
                // If already signed in today without signing out, maybe log an error or just overwrite?
                // Simple approach: Overwrite with the latest sign-in for pairing.
                openSessions[userName] = entryDate;
            } else if (entry.action === 'signout' && openSessions[userName]) {
                // Ensure sign-out is on the same day as the open sign-in
                const signInDate = openSessions[userName];
                const signInDayStr = formatDateISO(signInDate);

                if (signInDayStr === entryDayStr) {
                    const duration = entryDate.getTime() - signInDate.getTime();
                    if (duration > 0) {
                        dailyTotals[entryDayStr][userName] += duration;
                    }
                    // Clear the open session for this user after pairing
                    delete openSessions[userName];
                } else {
                    // Sign-out is on a different day than the last sign-in. Ignore the pair for simple calc.
                    // Could log this as an anomaly.
                     console.warn(`Sign-out for ${userName} on ${entryDayStr} does not match last sign-in day ${signInDayStr}. Ignoring pair.`);
                    // Clear the potentially stale open session
                    delete openSessions[userName];
                }
            }
        }
        // Note: Any sessions still in openSessions at the end were not closed with a sign-out on the same day.

        return dailyTotals;
    }


    /**
     * Populates the week selector dropdown based on available data.
     */
    function populateWeekSelector() {
        const dailyDurations = calculateDailyDurations(); // Recalculate to find all relevant dates
        const availableWeeks = new Set(); // Use a Set to store unique week start dates (YYYY-MM-DD)

        Object.keys(dailyDurations).forEach(dateStr => {
            const date = new Date(dateStr + 'T00:00:00'); // Ensure parsing as local date
            const startOfWeek = getStartOfWeek(date);
            availableWeeks.add(formatDateISO(startOfWeek));
        });

        // Also consider the current week even if it has no data yet
        const today = new Date();
        availableWeeks.add(formatDateISO(getStartOfWeek(today)));


        weekSelector.innerHTML = '<option value="">-- Select a Week --</option>'; // Clear existing

        // Sort weeks chronologically, most recent first
        const sortedWeeks = Array.from(availableWeeks).sort().reverse();

        if (sortedWeeks.length === 0) {
            weekSelector.innerHTML = '<option value="">-- No Data Found --</option>';
            return;
        }

        sortedWeeks.forEach(weekStartDateStr => {
            const option = document.createElement('option');
            option.value = weekStartDateStr; // Value is the Monday YYYY-MM-DD
            const startDate = new Date(weekStartDateStr + 'T00:00:00');
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6); // Sunday
            // Display format: "Week: Mar 24 - Mar 30, 2025"
             option.textContent = `Week: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
            weekSelector.appendChild(option);
        });

         // Attempt to select the *previous* week by default
         if (sortedWeeks.length > 0) {
            const lastMonday = getStartOfWeek(new Date());
            lastMonday.setDate(lastMonday.getDate() - 7); // Go back 7 days to get previous Monday
            const prevWeekStr = formatDateISO(lastMonday);

            if (sortedWeeks.includes(prevWeekStr)) {
                weekSelector.value = prevWeekStr;
            } else if (sortedWeeks.length > 0) {
                // If previous week isn't there, select the most recent available week
                 weekSelector.value = sortedWeeks[0];
            }
              // Trigger display for the selected week
             displayWeeklyTimesheet(weekSelector.value);
         }

    }

    /**
     * Generates and displays the timesheet summary for the selected week.
     * weekStartDateStr: The YYYY-MM-DD string for the Monday of the week to display.
     */
    function displayWeeklyTimesheet(weekStartDateStr) {
        timesheetSummaryBody.innerHTML = ''; // Clear previous summary

        if (!weekStartDateStr) {
             const row = timesheetSummaryBody.insertRow();
             const cell = row.insertCell(); cell.colSpan = 9;
             cell.textContent = 'Select a week to view the summary.';
             cell.style.textAlign = 'center';
            return;
        }

        const staffNames = getLocalStorageItem(STAFF_LIST_KEY);
        if (staffNames.length === 0) {
            const row = timesheetSummaryBody.insertRow();
            const cell = row.insertCell(); cell.colSpan = 9;
            cell.textContent = 'No staff members defined. Add staff first.';
            cell.style.textAlign = 'center';
            return;
        }

        const dailyDurations = calculateDailyDurations(); // Get pre-calculated daily ms totals
        const weekStart = new Date(weekStartDateStr + 'T00:00:00'); // Ensure local time zone
        const weeklySummary = {}; // { 'UserName': { 0: hrs, 1: hrs, ..., 6: hrs, total: hrs } } (0=Mon, 6=Sun)

        // Initialize summary structure for all defined staff
        staffNames.forEach(name => {
            weeklySummary[name] = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, total: 0 };
        });

        // Iterate through the 7 days of the selected week
        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(weekStart);
            currentDay.setDate(weekStart.getDate() + i);
            const currentDayStr = formatDateISO(currentDay);
            const dayOfWeekIndex = (currentDay.getDay() + 6) % 7; // Convert Sunday=0..Saturday=6 to Monday=0..Sunday=6

            if (dailyDurations[currentDayStr]) {
                Object.keys(dailyDurations[currentDayStr]).forEach(userName => {
                    if (weeklySummary[userName] !== undefined) { // Only include known staff
                        const dailyMillis = dailyDurations[currentDayStr][userName];
                        const dailyHours = msToDecimalHours(dailyMillis);
                        weeklySummary[userName][dayOfWeekIndex] += dailyHours;
                        weeklySummary[userName].total += dailyHours;
                    }
                });
            }
        }

        // Populate the table
        staffNames.forEach(name => {
            const summary = weeklySummary[name];
            const row = timesheetSummaryBody.insertRow();

            row.insertCell().textContent = name; // Staff Name
            row.insertCell().textContent = formatHours(summary[0]); // Monday
            row.insertCell().textContent = formatHours(summary[1]); // Tuesday
            row.insertCell().textContent = formatHours(summary[2]); // Wednesday
            row.insertCell().textContent = formatHours(summary[3]); // Thursday
            row.insertCell().textContent = formatHours(summary[4]); // Friday
            row.insertCell().textContent = formatHours(summary[5]); // Saturday
            row.insertCell().textContent = formatHours(summary[6]); // Sunday
            row.insertCell().textContent = formatHours(summary.total); // Weekly Total
             // Optional: Style the total column
             row.cells[8].style.fontWeight = 'bold';
        });

         if (timesheetSummaryBody.rows.length === 0) {
             const row = timesheetSummaryBody.insertRow();
             const cell = row.insertCell(); cell.colSpan = 9;
             cell.textContent = 'No work records found for this week for the defined staff.';
             cell.style.textAlign = 'center';
         }
    }


    // ==========================================================
    // --- Event Listeners ---
    // ==========================================================
    addStaffBtn.addEventListener('click', addStaff);
    refreshLogBtn.addEventListener('click', () => {
        displayAttendanceLog();
        // Also refresh timesheet data in case logs changed
        populateWeekSelector();
    });
     clearLogBtn.addEventListener('click', clearAttendanceLog);

    // Listener for the new week selector
    weekSelector.addEventListener('change', (event) => {
        displayWeeklyTimesheet(event.target.value);
    });

    // ==========================================================
    // --- Initial Load ---
    // ==========================================================
    displayStaffList();
    displayAttendanceLog();
    populateWeekSelector(); // This will also trigger the initial display of the (previous) week's summary

}); // End DOMContentLoaded