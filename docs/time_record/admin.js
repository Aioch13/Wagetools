document.addEventListener('DOMContentLoaded', () => {
    // Staff Management Elements
    const newStaffNameInput = document.getElementById('newStaffName');
    const addStaffBtn = document.getElementById('addStaffBtn');
    const staffListUl = document.getElementById('staffList');

    // Attendance Log Elements
    const attendanceLogBody = document.getElementById('attendanceLogBody');
    const refreshLogBtn = document.getElementById('refreshLogBtn');
    const clearLogBtn = document.getElementById('clearLogBtn');

    // Local Storage Keys (MUST match staff.js)
    const STAFF_LIST_KEY = 'staffList';
    const ATTENDANCE_LOG_KEY = 'attendanceLog';

    // --- Local Storage Helpers (could be shared in a separate utils.js) ---
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

    // --- Staff Management ---
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
            removeBtn.classList.add('danger-btn'); // Optional: style differently
            removeBtn.addEventListener('click', () => removeStaff(name));

            li.appendChild(removeBtn);
            staffListUl.appendChild(li);
        });
    }

    function addStaff() {
        const newName = newStaffNameInput.value.trim();
        if (!newName) {
            alert('Please enter a staff name.');
            return;
        }

        const staffNames = getLocalStorageItem(STAFF_LIST_KEY);

        if (staffNames.includes(newName)) {
            alert(`${newName} is already in the list.`);
            return;
        }

        staffNames.push(newName);
        setLocalStorageItem(STAFF_LIST_KEY, staffNames);
        newStaffNameInput.value = ''; // Clear input
        displayStaffList(); // Refresh display
        alert(`${newName} added successfully.`);
    }

    function removeStaff(nameToRemove) {
         if (!confirm(`Are you sure you want to remove ${nameToRemove}? This cannot be undone.`)) {
            return;
        }
        let staffNames = getLocalStorageItem(STAFF_LIST_KEY);
        staffNames = staffNames.filter(name => name !== nameToRemove); // Keep only names that are NOT the one to remove
        setLocalStorageItem(STAFF_LIST_KEY, staffNames);
        displayStaffList(); // Refresh display
         alert(`${nameToRemove} removed successfully.`);
    }

    // --- Attendance Log ---
    function displayAttendanceLog() {
        const attendanceLog = getLocalStorageItem(ATTENDANCE_LOG_KEY);
        attendanceLogBody.innerHTML = ''; // Clear current log display

        if (attendanceLog.length === 0) {
             const row = attendanceLogBody.insertRow();
             const cell = row.insertCell();
             cell.colSpan = 3; // Span across all columns
             cell.textContent = 'No attendance records found in this browser\'s local storage.';
             cell.style.textAlign = 'center';
            return;
        }

        // Sort by timestamp descending (most recent first)
        attendanceLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));


        attendanceLog.forEach(entry => {
            const row = attendanceLogBody.insertRow();

            const timestampCell = row.insertCell();
            const nameCell = row.insertCell();
            const actionCell = row.insertCell();

            timestampCell.textContent = new Date(entry.timestamp).toLocaleString(); // Format date/time nicely
            nameCell.textContent = entry.name;
            actionCell.textContent = entry.action;
             // Optional styling based on action
             if (entry.action === 'signin') {
                actionCell.style.color = 'green';
             } else if (entry.action === 'signout') {
                 actionCell.style.color = 'orange';
             }
        });
    }

    function clearAttendanceLog() {
        if (!confirm('Are you SURE you want to clear the ENTIRE attendance log stored in THIS browser? This cannot be undone.')) {
            return;
        }
        setLocalStorageItem(ATTENDANCE_LOG_KEY, []); // Set to empty array
        displayAttendanceLog(); // Refresh display
        alert('Attendance log cleared for this browser.');
    }


    // --- Event Listeners ---
    addStaffBtn.addEventListener('click', addStaff);
    refreshLogBtn.addEventListener('click', displayAttendanceLog);
    clearLogBtn.addEventListener('click', clearAttendanceLog);


    // --- Initial Load ---
    displayStaffList();
    displayAttendanceLog();
});