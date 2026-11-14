
let students = [];

function addStudent() {
    const nameInput = document.getElementById("studentName");
    const idInput = document.getElementById("studentId");

    const name = nameInput.value.trim();
    const id = idInput.value.trim();

    if (!name || !id) {
        alert("Please enter student name and ID.");
        return;
    }

    if (students.some(student => student.id === id)) {
        alert("This student ID already exists.");
        return;
    }

    students.push({
        name: name,
        id: id,
        status: "Not Marked"
    });

    nameInput.value = "";
    idInput.value = "";

    displayStudents();
}

function markAttendance(id, status) {
    const student = students.find(s => s.id === id);

    if (student) {
        student.status = status;
        displayStudents();
    }
}

function displayStudents() {
    const list = document.getElementById("studentList");

    list.innerHTML = "";

    students.forEach(student => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${student.id}</td>
            <td>${student.name}</td>
            <td>${student.status}</td>
            <td>
                <button onclick="markAttendance('${student.id}', 'Present')">
                    Present
                </button>
                <button onclick="markAttendance('${student.id}', 'Absent')">
                    Absent
                </button>
            </td>
        `;

        list.appendChild(row);
    });

    document.getElementById("totalStudents").textContent = students.length;

    document.getElementById("presentCount").textContent =
        students.filter(s => s.status === "Present").length;

    document.getElementById("absentCount").textContent =
        students.filter(s => s.status === "Absent").length;
}
