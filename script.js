
// ==========================================
// ATTENDPRO - SUPABASE CONNECTION
// ==========================================

// 1. ADD YOUR SUPABASE DETAILS HERE
const SUPABASE_URL = "https://ikprexvsshalwtkpvxdg.supabase.co";
const SUPABASE_KEY = "sb_publishable_f506hHM7Di4uiLGfSGmKHw_SoDHAuS5";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// Application data
let students = [];
let attendanceRecords = {};
let attendanceChart = null;

// HTML elements
const loginScreen = document.getElementById("loginScreen");
const appContainer = document.getElementById("appContainer");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const studentForm = document.getElementById("studentForm");
const attendanceDate = document.getElementById("attendanceDate");

// Today's date
function getToday() {
    const date = new Date();
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}

document.getElementById("todayDate").textContent =
    new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });

attendanceDate.value = getToday();

// ==========================================
// 2. LOGIN
// ==========================================

loginForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    loginMessage.textContent = "Signing in...";

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const { data, error } = await db.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        loginMessage.textContent = error.message;
        return;
    }

    loginMessage.textContent = "";

    await showDashboard(data.user);
});

// ==========================================
// 3. SHOW DASHBOARD
// ==========================================

async function showDashboard(user) {
    loginScreen.hidden = true;
    appContainer.hidden = false;

    document.getElementById("adminEmail").textContent =
        user.email || "Administrator";

    await loadData();
}

// ==========================================
// 4. LOGOUT
// ==========================================

document.getElementById("logoutButton").addEventListener(
    "click",
    async function() {
        const { error } = await db.auth.signOut();

        if (error) {
            alert(error.message);
            return;
        }

        students = [];
        attendanceRecords = {};

        appContainer.hidden = true;
        loginScreen.hidden = false;
        loginForm.reset();
    }
);

// ==========================================
// 5. LOAD DATABASE RECORDS
// ==========================================

async function loadData() {
    const { data: studentData, error: studentError } =
        await db.from("students")
            .select("id, student_id, full_name, student_class")
            .order("created_at", { ascending: false });

    if (studentError) {
        alert("Could not load students: " + studentError.message);
        return;
    }

    students = studentData.map(student => ({
        dbId: student.id,
        id: student.student_id,
        name: student.full_name,
        studentClass: student.student_class
    }));

    await loadAttendance();
}

// ==========================================
// 6. LOAD ATTENDANCE
// ==========================================

async function loadAttendance() {
    const date = attendanceDate.value || getToday();

    const { data, error } = await db.from("attendance")
        .select("student_id, attendance_date, status")
        .eq("attendance_date", date);

    if (error) {
        alert("Could not load attendance: " + error.message);
        return;
    }

    attendanceRecords = {};

    data.forEach(record => {
        attendanceRecords[record.student_id] = record.status;
    });

    displayStudents();
}

// ==========================================
// 7. REGISTER STUDENT
// ==========================================

studentForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    const name = document.getElementById("studentName").value.trim();
    const id = document.getElementById("studentId").value.trim();
    const studentClass = document.getElementById("studentClass").value.trim();

    if (!name || !id || !studentClass) {
        alert("Please complete all fields.");
        return;
    }

    const submitButton = studentForm.querySelector(
        'button[type="submit"]'
    );

    submitButton.disabled = true;
    submitButton.textContent = "Saving...";

    const { error } = await db.from("students").insert([{
        student_id: id,
        full_name: name,
        student_class: studentClass
    }]);

    submitButton.disabled = false;
    submitButton.textContent = "+ Add Student";

    if (error) {
        alert("Could not register student: " + error.message);
        return;
    }

    studentForm.reset();

    await loadData();

    alert("Student registered successfully!");
});

// ==========================================
// 8. GET ATTENDANCE STATUS
// ==========================================

function getRecord(studentDbId) {
    return attendanceRecords[studentDbId] || "Not Marked";
}

// ==========================================
// 9. MARK ATTENDANCE
// ==========================================

async function markAttendance(studentDbId, status) {
    const date = attendanceDate.value || getToday();

    const { error } = await db.from("attendance").upsert(
        [{
            student_id: studentDbId,
            attendance_date: date,
            status: status
        }],
        {
            onConflict: "student_id,attendance_date"
        }
    );

    if (error) {
        alert("Could not save attendance: " + error.message);
        return;
    }

    await loadAttendance();
}

// ==========================================
// 10. DISPLAY STUDENTS
// ==========================================

displayStudents();
await loadAttendanceChart();{
    const list = document.getElementById("attendanceList");
    const search = document.getElementById("searchStudent")
        .value.toLowerCase();

    list.innerHTML = "";

    const filteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(search) ||
        student.id.toLowerCase().includes(search) ||
        student.studentClass.toLowerCase().includes(search)
    );

    filteredStudents.forEach(student => {
        const status = getRecord(student.dbId);

        const row = document.createElement("tr");

        const values = [
            student.name,
            student.id,
            student.studentClass
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const statusCell = document.createElement("td");
        statusCell.textContent = status;
        statusCell.className =
            "status-" + status.toLowerCase().replace(" ", "-");

        const actionCell = document.createElement("td");

        const presentButton = document.createElement("button");
        presentButton.textContent = "Present";
        presentButton.className = "primary-btn";
        presentButton.type = "button";
        presentButton.addEventListener("click", () =>
            markAttendance(student.dbId, "Present")
        );

        const absentButton = document.createElement("button");
        absentButton.textContent = "Absent";
        absentButton.className = "primary-btn";
        absentButton.type = "button";
        absentButton.style.background = "#dc2626";
        absentButton.addEventListener("click", () =>
            markAttendance(student.dbId, "Absent")
        );

        actionCell.append(presentButton, absentButton);

        row.append(statusCell, actionCell);
        list.appendChild(row);
    });

    updateStatistics();
}

// ==========================================
// 11. DASHBOARD STATISTICS
// ==========================================

function updateStatistics() {
    const present = students.filter(
        student => getRecord(student.dbId) === "Present"
    ).length;

    const absent = students.filter(
        student => getRecord(student.dbId) === "Absent"
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

// ==========================================
// 12. SEARCH AND DATE FILTER
// ==========================================

document.getElementById("searchStudent").addEventListener(
    "input",
    displayStudents
);

attendanceDate.addEventListener("change", loadAttendance);

// ==========================================
// 13. CHECK EXISTING LOGIN SESSION
// ==========================================

async function initializeApp() {
    const { data, error } = await db.auth.getSession();

    if (error) {
        loginMessage.textContent = error.message;
        return;
    }

    if (data.session) {
        await showDashboard(data.session.user);
    } else {
        loginScreen.hidden = false;
        appContainer.hidden = true;
    }
}

initializeApp();
