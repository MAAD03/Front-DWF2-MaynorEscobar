document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const correo = document.getElementById('correo').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('message');

    try {
        const response = await fetch('https://dwpf2-maynorescobar-backend.onrender.com/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ correo, password })
        });

        if (response.ok) {
            const admin = await response.json();
            messageDiv.textContent = 'Inicio de sesión exitoso';
            messageDiv.className = 'message success';
            messageDiv.style.display = 'block';
            setTimeout(() => {
                window.location.href = 'configuracion.html';
            }, 1000);
        } else {
            messageDiv.textContent = 'Correo o contraseña incorrectos';
            messageDiv.className = 'message fail';
            messageDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Error en la solicitud:', error);
        messageDiv.textContent = 'Error en el servidor, intenta de nuevo';
        messageDiv.className = 'message fail';
        messageDiv.style.display = 'block';
    }
});