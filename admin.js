const API_URL = 'https://dwpf2-maynorescobar-backend.onrender.com/api/admin';
async function loadAdmins() {
    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (response.ok) {
            const admins = await response.json();
            displayAdmins(admins);
        } else {
            showMessage('Error al cargar administradores', false);
        }
    } catch (error) {
        console.error('Error en la solicitud:', error);
        showMessage('Error en la conexión con el servidor', false);
    }
}

function displayAdmins(admins) {
    const tableBody = document.getElementById('admin-table-body');
    tableBody.innerHTML = '';
    admins.forEach(admin => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="table-cell">${admin.idAdmin}</td>
            <td class="table-cell">${admin.correo}</td>
            <td class="table-cell">${admin.password}</td>
            <td class="table-cell">${admin.nombreCompleto}</td>
            <td class="table-cell">${admin.activo ? 'Sí' : 'No'}</td>
            <td class="table-cell">
                <button onclick="editAdmin(${admin.idAdmin})" class="button edit-btn">Editar</button>
                <button onclick="deleteAdmin(${admin.idAdmin})" class="button delete-btn">Eliminar</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function showModal(isEdit = false, admin = null) {
    const modal = document.getElementById('admin-modal');
    const form = document.getElementById('admin-form');
    const title = document.getElementById('modal-title');
    
    form.reset();
    document.getElementById('modal-message').style.display = 'none';
    
    if (isEdit && admin) {
        title.textContent = 'Editar Administrador';
        document.getElementById('admin-id').value = admin.idAdmin;
        document.getElementById('correo').value = admin.correo;
        document.getElementById('password').value = '';
        document.getElementById('nombre').value = admin.nombreCompleto;
        document.getElementById('activo').checked = admin.activo;
    } else {
        title.textContent = 'Agregar Administrador';
        document.getElementById('admin-id').value = '';
    }
    
    modal.classList.remove('hidden');
}

async function saveAdmin(event) {
    event.preventDefault();
    const id = document.getElementById('admin-id').value;
    const admin = {
        correo: document.getElementById('correo').value,
        password: document.getElementById('password').value,
        nombreCompleto: document.getElementById('nombre').value,
        activo: document.getElementById('activo').checked
    };

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/${id}` : API_URL;
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(admin)
        });

        if (response.ok) {
            showMessage(id ? 'Administrador actualizado' : 'Administrador creado', true);
            closeModal();
            loadAdmins();
        } else {
            showMessage('Error al guardar el administrador', false);
        }
    } catch (error) {
        console.error('Error en la solicitud:', error);
        showMessage('Error en la conexión con el servidor', false);
    }
}

async function editAdmin(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (response.ok) {
            const admin = await response.json();
            showModal(true, admin);
        } else {
            showMessage('Error al cargar datos del administrador', false);
        }
    } catch (error) {
        console.error('Error en la solicitud:', error);
        showMessage('Error en la conexión con el servidor', false);
    }
}

async function deleteAdmin(id) {
    if (!confirm('¿Seguro que desea eliminar este administrador?')) return;
    
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (response.ok) {
            showMessage('Administrador eliminado', true);
            loadAdmins();
        } else {
            showMessage('Error al eliminar el administrador', false);
        }
    } catch (error) {
        console.error('Error en la solicitud:', error);
        showMessage('Error en la conexión con el servidor', false);
    }
}

function showMessage(message, isSuccess) {
    const messageDiv = document.getElementById('modal-message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${isSuccess ? 'success' : 'fail'}`;
    messageDiv.style.display = 'block';
}

function closeModal() {
    document.getElementById('admin-modal').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    loadAdmins();
    document.getElementById('add-admin-btn').addEventListener('click', () => showModal());
    document.getElementById('admin-form').addEventListener('submit', saveAdmin);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
});