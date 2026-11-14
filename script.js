

// AttendPro - Attendance Management System

let students = JSON.parse(localStorage.getItem("attendProStudents")) || [];

let attendanceRecords = JSON.parse(
    localStorage.getItem("attendProAttendance")
) || {};

// Get today's date
function getToday() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Save data
function saveData() {
    localStorage.setItem("attendProStudents", JSON.stringify(students));
    localStorage.setItem(
        "attendProAttendance",
        JSON.stringify(attendanceRecords)
    );
}

// Set today's date
const todayDate = document.getElementById("todayDate");
const attendanceDate = document.getElementById("attendanceDate");

if (todayDate) {
    todayDate.textContent = new Date().toLocaleDateString(
        "en-US",
        { weekday: "long", year: "numeric", month: "long", day: "numeric" }
    );
}

if (attendanceDate) {
    attendanceDate.value = getToday();
}

// Get attendance for selected date
function getRecord(date, id) {
    return attendanceRecords[date]?.[id] || "Not Marked";
}

// Register student
document.getElementById("studentForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const name = document.getElementById("studentName").value.trim();
    const id = document.getElementById("studentId").value.trim();
    const studentClass = document.getElementById("studentClass").value.trim();

    if (!name || !id || !studentClass) {
        alert("Please complete all fields.");
        return;
    }

    if (students.some(student => student.id.toLowerCase() === id.toLowerCase())) {
        alert("This student ID already exists.");
        return;
    }

    students.push({
        name: name,
        id: id,
        studentClass: studentClass
    });

    saveData();
    this.reset();
    displayStudents();

    alert("Student registered successfully!");
});

// Mark attendance
function markAttendance(id, status) {
    const date = attendanceDate.value || getToday();

    if (!attendanceRecords[date]) {
        attendanceRecords[date] = {};
    }

    attendanceRecords[date][id] = status;

    saveData();
    displayStudents();
}

// Display students
function displayStudents() {
    const list = document.getElementById("attendanceList");
    const search = document.getElementById("searchStudent").value.toLowerCase();
    const date = attendanceDate.value || getToday();

    list.innerHTML = "";

    const filteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(search) ||
        student.id.toLowerCase().includes(search) ||
        student.studentClass.toLowerCase().includes(search)
    );

    filteredStudents.forEach(student => {
        const status = getRecord(date, student.id);

        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = student.name;

        const idCell = document.createElement("td");
        idCell.textContent = student.id;

        const classCell = document.createElement("td");
        classCell.textContent = student.studentClass;

        const statusCell = document.createElement("td");
        statusCell.textContent = status;
        statusCell.className = "status-" + status.toLowerCase().replace(" ", "-");

        const actionCell = document.createElement("td");

        const presentButton = document.createElement("button");
        presentButton.textContent = "Present";
        presentButton.className = "primary-btn";
        presentButton.type = "button";
        presentButton.addEventListener("click", () =>
            markAttendance(student.id, "Present")
        );

        const absentButton = document.createElement("button");
        absentButton.textContent = "Absent";
        absentButton.className = "primary-btn";
        absentButton.type = "button";
        absentButton.addEventListener("click", () =>
            markAttendance(student.id, "Absent")
        );

        actionCell.append(presentButton, absentButton);

        row.append(nameCell, idCell, classCell, statusCell, actionCell);
        list.appendChild(row);
    });

    updateStatistics(date);
}

// Update dashboard statistics
function updateStatistics(date) {
    const present = students.filter(
        student => getRecord(date, student.id) === "Present"
    ).length;

    const absent = students.filter(
        student => getRecord(date, student.id) === "Absent"
    ).length;

    const total = students.length;
    const marked = present + absent;

    const rate = marked > 0
        ? Math.round((present / marked) * 100)
        : 0;

    document.getElementById("totalStudents").textContent = total;
    document.getElementById("presentStudents").textContent = present;
    document.getElementById("absentStudents").textContent = absent;
    document.getElementById("attendanceRate").textContent = rate + "%";

    document.getElementById("reportSummary").textContent =
        `Total Students: ${total} | Present: ${present} | Absent: ${absent} | Not Marked: ${total - marked} | Attendance Rate: ${rate}%`;
}

// Search students
document.getElementById("searchStudent").addEventListener("input", displayStudents);

// Change attendance date
attendanceDate.addEventListener("change", displayStudents);

// Initial display
displayStudents();
