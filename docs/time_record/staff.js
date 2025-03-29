document.addEventListener('DOMContentLoaded', () => {
    const staffSelect = document.getElementById('staffSelect');
    const signInBtn = document.getElementById('signInBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const statusMessage = document.getElementById('statusMessage');
    const lastActionDisplay = document.getElementById('lastAction');

    const STAFF_LIST_KEY = 'staffList';
    const ATTENDANCE_LOG_KEY = 'attendanceLog';

    // --- Local Storage Helpers ---
    function getLocalStorageItem(key, defaultValue = []) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error reading ${key} from localStorage:`, error);
            return defaultValue;
        }
    }

    function setLocalStorageItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Error writing ${key} to localStorage:`, error);
            statusMessage.textContent = 'Error saving data. LocalStorage might be full or disabled.';
            statusMessage.style.color = 'red';
        }
    }

    // --- Populate Staff Dropdown ---
    function loadStaffNames() {
        const staffNames = getLocalStorageItem(STAFF_LIST_KEY, ['Default User']); // Add a default if none exist

        // Clear existing options except the placeholder
        staffSelect.innerHTML = '<option value="">-- Select Name --</option>';

        staffNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            staffSelect.appendChild(option);
        });
        // Try to re-select last used name if available
        const lastSelected = localStorage.getItem('lastSelectedStaff');
        if (lastSelected && staffNames.includes(lastSelected)) {
            staffSelect.value = lastSelected;
        }
        updateLastActionDisplay(); // Show last action for the initially selected user
    }

    // --- Log Actions ---
    function logAction(action) {
        const selectedStaff = staffSelect.value;
        if (!selectedStaff) {
            statusMessage.textContent = 'Please select your name first.';
            statusMessage.style.color = 'orange';
            return;
        }

        const timestamp = new Date();
        const logEntry = {
            name: selectedStaff,
            action: action,
            timestamp: timestamp.toISOString() // Store in standard ISO format
        };

        const attendanceLog = getLocalStorageItem(ATTENDANCE_LOG_KEY);
        attendanceLog.push(logEntry);
        setLocalStorageItem(ATTENDANCE_LOG_KEY, attendanceLog);

        // Save last selected name for convenience
        localStorage.setItem('lastSelectedStaff', selectedStaff);

        const formattedTime = timestamp.toLocaleString(); // Format for display
        statusMessage.textContent = `Successfully recorded '${action}' for ${selectedStaff} at ${formattedTime}.`;
        statusMessage.style.color = 'green';
        updateLastActionDisplay(); // Update the last action display area
    }

    // --- Display Last Action ---
     function updateLastActionDisplay() {
        const selectedStaff = staffSelect.value;
        if (!selectedStaff) {
            lastActionDisplay.textContent = 'Select a name to see their last action.';
            return;
        }

        const attendanceLog = getLocalStorageItem(ATTENDANCE_LOG_KEY);
        const userLogs = attendanceLog.filter(entry => entry.name === selectedStaff);

        if (userLogs.length > 0) {
            const lastEntry = userLogs[userLogs.length - 1];
            const lastTime = new Date(lastEntry.timestamp).toLocaleString();
            lastActionDisplay.textContent = `Last action for ${selectedStaff}: ${lastEntry.action} at ${lastTime}`;
        } else {
            lastActionDisplay.textContent = `No actions recorded for ${selectedStaff} yet.`;
        }
    }


    // --- Event Listeners ---
    signInBtn.addEventListener('click', () => logAction('signin'));
    signOutBtn.addEventListener('click', () => logAction('signout'));
    staffSelect.addEventListener('change', updateLastActionDisplay); // Update last action when name changes


    // --- Initial Load ---
    loadStaffNames();
});