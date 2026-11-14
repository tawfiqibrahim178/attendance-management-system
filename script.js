
// ==========================================
// ATTENDPRO - COMPLETE SUPABASE SYSTEM
// ==========================================

// YOUR SUPABASE DETAILS
const SUPABASE_URL = "https://ikprexvsshalwtkpvxdg.supabase.co";
const SUPABASE_KEY = "sb_publishable_f506hHM7Di4uiLGfSGmKHw_SoDHAuS5";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// APPLICATION DATA
let students = [];
let attendanceRecords = {};
let attendanceChart = null;

// HTML ELEMENTS
const loginScreen = document.getElementById("loginScreen");
const appContainer = document.getElementById("appContainer");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const studentForm = document.getElementById("studentForm");
const attendanceDate = document.getElementById("attendanceDate");

// ==========================================
// 1. DATE FUNCTIONS
// ==========================================

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
// 2. ADMIN LOGIN
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

        if (attendanceChart) {
            attendanceChart.destroy();
            attendanceChart = null;
        }

        appContainer.hidden = true;
        loginScreen.hidden = false;
        loginForm.reset();
    }
);

// ==========================================
// 5. LOAD STUDENTS
// ==========================================

async function loadData() {

    const { data, error } = await db
        .from("students")
        .select("id, student_id, full_name, student_class")
        .order("created_at", { ascending: false });

    if (error) {
        alert("Could not load students: " + error.message);
        return;
    }

    students = data.map(student => ({
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

    const { data, error } = await db
        .from("attendance")
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

    await loadAttendanceChart();
}

// ==========================================
// 7. ATTENDANCE ANALYTICS CHART
// ==========================================

async function loadAttendanceChart() {

    const canvas = document.getElementById("attendanceChart");

    if (!canvas || !window.Chart) {
        console.error("Chart.js or attendance chart canvas is missing.");
        return;
    }

    const dates = [];

    for (let i = 6; i >= 0; i--) {

        const date = new Date();
        date.setDate(date.getDate() - i);

        const dateString = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");

        dates.push(dateString);
    }

    const { data, error } = await db
        .from("attendance")
        .select("attendance_date, status")
        .gte("attendance_date", dates[0])
        .lte("attendance_date", dates[6]);

    if (error) {
        console.error("Chart loading error:", error.message);
        return;
    }

    const presentCounts = dates.map(date =>
        data.filter(record =>
            record.attendance_date === date &&
            record.status === "Present"
        ).length
    );

    const absentCounts = dates.map(date =>
        data.filter(record =>
            record.attendance_date === date &&
            record.status === "Absent"
        ).length
    );

    const labels = dates.map(date =>
        new Date(date + "T12:00:00").toLocaleDateString(
            "en-US",
            { weekday: "short" }
        )
    );

    if (attendanceChart) {
        attendanceChart.destroy();
    }

    attendanceChart = new Chart(canvas, {

        type: "line",

        data: {
            labels: labels,

            datasets: [
                {
                    label: "Present",
                    data: presentCounts,
                    borderColor: "#25c984",
                    backgroundColor: "rgba(37,201,132,0.12)",
                    fill: true,
                    tension: 0.4
                },
                {
                    label: "Absent",
                    data: absentCounts,
                    borderColor: "#ef646e",
                    backgroundColor: "rgba(239,100,110,0.10)",
                    fill: true,
                    tension: 0.4
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    position: "top"
                }
            },

            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// ==========================================
// 8. REGISTER STUDENT
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
        'button[type="submit"], button:not([type])'
    );

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Saving...";
    }

    try {

        const { error } = await db
            .from("students")
            .insert([{
                student_id: id,
                full_name: name,
                student_class: studentClass
            }]);

        if (error) {
            alert("Could not register student: " + error.message);
            return;
        }

        studentForm.reset();

        await loadData();

        alert("Student registered successfully!");

    } catch (error) {

        alert("Something went wrong: " + error.message);

    } finally {

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "+ Add Student";
        }
    }
});

// ==========================================
// 9. GET ATTENDANCE STATUS
// ==========================================

function getRecord(studentDbId) {
    return attendanceRecords[studentDbId] || "Not Marked";
}

// ==========================================
// 10. MARK ATTENDANCE
// ==========================================

async function markAttendance(studentDbId, status) {

    const date = attendanceDate.value || getToday();

    const { error } = await db
        .from("attendance")
        .upsert(
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
// 11. DISPLAY STUDENTS
// ==========================================

function displayStudents() {

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
// 12. DASHBOARD STATISTICS
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
// 13. SEARCH AND DATE FILTER
// ==========================================

document.getElementById("searchStudent").addEventListener(
    "input",
    displayStudents
);

attendanceDate.addEventListener("change", loadAttendance);

// ==========================================
// 14. CHECK EXISTING LOGIN SESSION
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
