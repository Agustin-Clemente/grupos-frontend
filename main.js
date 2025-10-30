const API_URL = import.meta.env.VITE_API_URL;

let studentsData = [];

const group1Container = document.getElementById('group1-students');
const group2Container = document.getElementById('group2-students');
const changeSection = document.getElementById('change-section');
const changeGroup1Container = document.getElementById('change-group1');
const changeGroup2Container = document.getElementById('change-group2');
const messageModal = document.getElementById('message-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalOkBtn = document.getElementById('modal-ok-btn');
const dniModal = document.getElementById('dni-modal');
const dniModalMessage = document.getElementById('dni-modal-message');
const dniInput = document.getElementById('dni-input');
const dniModalConfirmBtn = document.getElementById('dni-modal-confirm-btn');
const dniModalCancelBtn = document.getElementById('dni-modal-cancel-btn');
const loadingOverlay = document.getElementById('loading-overlay');

function showMessageModal(title, message) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    messageModal.classList.remove('hidden');
}

function hideMessageModal() {
    messageModal.classList.add('hidden');
}

function showLoading() {
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

modalOkBtn.addEventListener('click', hideMessageModal);

async function fetchStudents() {
    showLoading();
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        studentsData = await response.json();
        renderStudents(studentsData);
    } catch (error) {
        console.error("Error fetching students:", error);
        showMessageModal('Error de Conexión', 'No se pudieron cargar los alumnos. Por favor, revisa la conexión con el servidor.');
    } finally {
        hideLoading();
    }
}

function renderStudents(students) {
    group1Container.innerHTML = `<h2 class="text-2xl font-bold mb-4 group-heading rounded-t-xl w-full">Grupo 1 Miércoles 05-11-2025 16:30 a 18:15 hs</h2>`;
    group2Container.innerHTML = `<h2 class="text-2xl font-bold mb-4 group-heading rounded-t-xl w-full">Grupo 2 Miércoles 05-11-2025 18:15 a 20:00 hs</h2>`;
    changeGroup1Container.innerHTML = `<h3 class="text-xl font-semibold mb-4 text-yellow-300">Grupo 1 Grupo 1 Miércoles 05-11-2025 16:30 a 18:15 hs</h3>`;
    changeGroup2Container.innerHTML = `<h3 class="text-xl font-semibold mb-4 text-yellow-300">Grupo 2 Grupo 2 Miércoles 05-11-2025 18:15 a 20:00 hs</h3>`;

    const changeRequests = students.filter(s => s.estado === 'Quiero cambiar');

    if (changeRequests.length > 0) {
        changeSection.classList.remove('hidden');
    } else {
        changeSection.classList.add('hidden');
    }

    students.forEach(student => {
        const studentCard = createStudentCard(student);
        if (student.estado === 'Quiero cambiar') {
            if (student.grupo === 1) {
                changeGroup1Container.appendChild(studentCard);
            } else {
                changeGroup2Container.appendChild(studentCard);
            }
        } else {
            if (student.grupo === 1) {
                group1Container.appendChild(studentCard);
            } else {
                group2Container.appendChild(studentCard);
            }
        }
    });
}

function createStudentCard(student) {
    const studentCard = document.createElement('div');
    studentCard.classList.add('card', 'p-4', 'rounded-2xl', 'flex', 'flex-col', 'items-start', 'w-full', 'mb-4', 'gap-4', 'cursor-pointer');

    /* studentCard.draggable = true;
    studentCard.dataset.id = student._id;
    studentCard.dataset.group = student.grupo; */

    /*  studentCard.ondragstart = (event) => {
         event.dataTransfer.setData("text/plain", student._id);
         event.currentTarget.classList.add('moving');
     };

     studentCard.ondragend = (event) => {
         event.currentTarget.classList.remove('moving');
     }; */

    switch (student.estado) {
        case 'OK':
            studentCard.classList.add('response-ok');
            break;
        case 'No asistiré':
            studentCard.classList.add('response-no-attend');
            break;
        case 'Quiero cambiar':
            studentCard.classList.add('response-change');
            break;
    }

    const nameElement = document.createElement('span');
    nameElement.textContent = student.nombre;
    nameElement.classList.add('text-lg', 'font-semibold', 'text-white');
    studentCard.appendChild(nameElement);

    const selectElement = document.createElement('select');
    selectElement.classList.add('rounded-lg', 'p-2', 'bg-gray-700', 'text-white', 'w-full', 'focus:outline-none');
    selectElement.innerHTML = `
                <option value="OK">OK</option>
                <option value="Quiero cambiar">Quiero cambiar</option>
                <option value="No asistiré">No asistiré</option>
            `;
    selectElement.value = student.estado;

    selectElement.addEventListener('change', (event) => {
        const newStatus = event.target.value;
        const previousStatus = student.estado;
        showDniModal(student, newStatus, previousStatus, event.target);
    });
    studentCard.appendChild(selectElement);

    return studentCard;
}

function showDniModal(student, newStatus, previousStatus, selectElement) {
    dniInput.value = '';
    dniModalMessage.textContent = `Por favor, ingresa tu DNI (solo números sin puntos) para confirmar:`;
    dniModal.classList.remove('hidden');

    const confirmHandler = async () => {
        const dni = dniInput.value.trim();
        if (dni !== '') {
            if (dni === student.dni) {
                try {
                    if (newStatus === 'Quiero cambiar') {
                        showLoading();
                        const response = await fetch(API_URL);
                        const latestStudentsData = await response.json();
                        const otherGroup = student.grupo === 1 ? 2 : 1;
                        const otherStudent = latestStudentsData.find(s => s.grupo === otherGroup && s.estado === 'Quiero cambiar');

                        if (otherStudent) {
                            await Promise.all([
                                updateStudent(student._id, { grupo: otherStudent.grupo, estado: 'OK' }),
                                updateStudent(otherStudent._id, { grupo: student.grupo, estado: 'OK' })
                            ]);
                            showMessageModal('Intercambio exitoso', `${student.nombre} y ${otherStudent.nombre} han sido intercambiados/as.`);
                        } else {
                            await updateStudent(student._id, { estado: newStatus });
                            showMessageModal('Confirmación', 'Tu respuesta ha sido registrada exitosamente. Esperando por un/a compañero/a de intercambio.');
                        }
                    } else {
                        await updateStudent(student._id, { estado: newStatus });
                        showMessageModal('Confirmación', 'Tu respuesta ha sido registrada exitosamente.');
                    }
                } catch (error) {
                    console.error('Error al actualizar el estado:', error);
                    showMessageModal('Error', 'Hubo un problema al registrar la respuesta.');
                    selectElement.value = previousStatus;
                } finally {
                    fetchStudents();
                }
            } else {
                showMessageModal('Error de DNI', 'El DNI ingresado es incorrecto.');
                selectElement.value = previousStatus;
            }
        } else {
            showMessageModal('Error de DNI', 'No se ha ingresado un DNI.');
            selectElement.value = previousStatus;
        }
        dniModal.classList.add('hidden');
        dniModalConfirmBtn.removeEventListener('click', confirmHandler);
        dniModalCancelBtn.removeEventListener('click', cancelHandler);
    };

    const cancelHandler = () => {
        selectElement.value = previousStatus;
        dniModal.classList.add('hidden');
        dniModalConfirmBtn.removeEventListener('click', confirmHandler);
        dniModalCancelBtn.removeEventListener('click', cancelHandler);
    };

    dniModalConfirmBtn.addEventListener('click', confirmHandler);
    dniModalCancelBtn.addEventListener('click', cancelHandler);
}

/* window.allowDrop = function(event) {
    event.preventDefault();
} */

/* window.drop = async function(event) {
    event.preventDefault();
    const studentId = event.dataTransfer.getData("text/plain");
    const targetContainer = event.target.closest('#change-group1, #change-group2, #group1-students, #group2-students');
    
    if (!targetContainer || !studentId) {
        return;
    }

    showLoading();
    
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('Error al obtener los datos más recientes del servidor.');
        }
        const latestStudentsData = await response.json();

        const studentToMove = latestStudentsData.find(s => s._id === studentId);
        if (!studentToMove) {
            return;
        }

        const isOriginalGroupContainer = targetContainer.id === 'group1-students' || targetContainer.id === 'group2-students';
        const isChangeSectionContainer = targetContainer.id === 'change-group1' || targetContainer.id === 'change-group2';

        if (isOriginalGroupContainer) {
            await updateStudent(studentToMove._id, { estado: 'OK' });
        } else if (isChangeSectionContainer) {
            const otherGroup = studentToMove.grupo === 1 ? 2 : 1;
            const otherStudent = latestStudentsData.find(s => s.grupo === otherGroup && s.estado === 'Quiero cambiar');

            if (otherStudent) {
                // Se encontró un compañero: realizar el intercambio 1 a 1
                await Promise.all([
                    updateStudent(studentToMove._id, { grupo: otherStudent.grupo, estado: 'OK' }),
                    updateStudent(otherStudent._id, { grupo: studentToMove.grupo, estado: 'OK' })
                ]);
                showMessageModal('Intercambio exitoso', `${studentToMove.nombre} y ${otherStudent.nombre} han sido intercambiados.`);
            } else {
                // No hay compañero: solo actualizar el estado del alumno arrastrado a 'Quiero cambiar'
                await updateStudent(studentToMove._id, { estado: 'Quiero cambiar' });
            }
        }
    } catch (error) {
        console.error('Error en el drop:', error);
        showMessageModal('Error en el Intercambio', 'Hubo un problema al realizar el intercambio. Por favor, inténtalo de nuevo.');
    } finally {
        fetchStudents();
        hideLoading();
    }
} */

async function updateStudent(id, data) {
    showLoading();
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const updatedStudent = await response.json();
        console.log('Alumno actualizado:', updatedStudent);
    } catch (error) {
        console.error('Error actualizando el alumno:', error);
        throw error;
    } finally {
        hideLoading();
    }
}

document.addEventListener('DOMContentLoaded', fetchStudents);
