// Constantes
const API_BASE_URL = 'https://24a0dac0-2579-4138-985c-bec2df4bdfcc-00-3unzo70c406dl.riker.replit.dev';
const LOGIN_URL = `${API_BASE_URL}/login`;
const PASSWORD = '1234';

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'index.html' || currentPage === '') {
        // Si estamos en la página de login y el usuario ya está autenticado, redirigir a notas
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            window.location.href = 'notas.html';
        }
        
        // Configurar el formulario de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
    } else if (currentPage === 'notas.html') {
        // Si estamos en la página de notas y el usuario no está autenticado, redirigir a login
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        // Mostrar información del usuario
        displayUserInfo(user);
        
        // Cargar las notas
        loadNotas(user.codigo);
        
        // Configurar el botón de cerrar sesión
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        // Configurar búsqueda
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }
    }
});

// Mostrar información del usuario
function displayUserInfo(user) {
    document.getElementById('user-name').textContent = user.nombre;
    document.getElementById('user-code').textContent = user.codigo;
    document.getElementById('welcome-name').textContent = user.nombre.split(' ')[0]; // Solo el primer nombre
}

// Manejar el envío del formulario de login
async function handleLogin(event) {
    event.preventDefault();
    
    const codigo = document.getElementById('codigo').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    const loginBtn = document.querySelector('.login-btn');
    
    // Mostrar estado de carga
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<div class="loading"></div>';
    loginBtn.disabled = true;
    
    // Validar que la contraseña sea 1234
    if (password !== PASSWORD) {
        showError('Credenciales no válidas');
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
        return;
    }
    
    try {
        // Realizar petición POST al servicio de login
        const response = await fetch(LOGIN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                codigo: codigo,
                clave: password
            })
        });
        
        if (response.ok) {
            const user = await response.json();
            
            // Guardar usuario en localStorage
            localStorage.setItem('user', JSON.stringify(user));
            
            // Animación de éxito
            loginBtn.innerHTML = '<i class="fas fa-check"></i><span>¡Éxito!</span>';
            loginBtn.classList.add('success-animation');
            
            // Redirigir después de un breve delay
            setTimeout(() => {
                window.location.href = 'notas.html';
            }, 1000);
        } else {
            showError('Credenciales no válidas');
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error en el login:', error);
        showError('Error de conexión. Intente nuevamente.');
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

// Mostrar mensaje de error
function showError(message) {
    const errorMessage = document.getElementById('error-message');
    errorMessage.querySelector('span').textContent = message;
    errorMessage.style.display = 'flex';
    
    // Limpiar campos después de un tiempo
    setTimeout(() => {
        document.getElementById('codigo').value = '';
        document.getElementById('password').value = '';
        errorMessage.style.display = 'none';
    }, 3000);
}

// Cargar las notas del estudiante
async function loadNotas(codigo) {
    try {
        console.log(`Cargando notas para código: ${codigo}`);
        
        const response = await fetch(`${API_BASE_URL}/students/${codigo}/notas`);
        console.log('Respuesta de la API:', response);
        
        if (response.ok) {
            const notas = await response.json();
            console.log('Datos de notas recibidos:', notas);
            displayNotas(notas);
            updateStats(notas);
        } else {
            console.error('Error al cargar las notas. Status:', response.status);
            showNotasError('No se pudieron cargar las notas. Intente nuevamente.');
        }
    } catch (error) {
        console.error('Error al cargar las notas:', error);
        showNotasError('Error de conexión al cargar las notas.');
    }
}

// Mostrar error en la página de notas
function showNotasError(message) {
    const notasBody = document.getElementById('notas-body');
    notasBody.innerHTML = `
        <tr>
            <td colspan="8" style="text-align: center; color: var(--danger-color); padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>${message}</p>
            </td>
        </tr>
    `;
}

// Mostrar las notas en la tabla
function displayNotas(notas) {
    const notasBody = document.getElementById('notas-body');
    
    // Verificar si las notas están vacías o no son un array
    if (!notas || !Array.isArray(notas) || notas.length === 0) {
        notasBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: var(--light-text); padding: 40px;">
                    <i class="fas fa-book" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>No hay notas registradas para este estudiante.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    notasBody.innerHTML = '';
    
    let sumaPonderada = 0;
    let totalCreditos = 0;
    let asignaturasAprobadas = 0;
    
    notas.forEach(asignatura => {
        const definitiva = calcularDefinitiva(asignatura);
        const estado = definitiva >= 3.0 ? 'Aprobado' : 'Reprobado';
        const estadoClass = definitiva >= 3.0 ? 'status-aprobado' : 'status-reprobado';
        
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${asignatura.asignatura || 'Sin nombre'}</td>
            <td>${asignatura.creditos || 0}</td>
            <td>${asignatura.p1 !== undefined ? asignatura.p1.toFixed(1) : 'N/A'}</td>
            <td>${asignatura.p2 !== undefined ? asignatura.p2.toFixed(1) : 'N/A'}</td>
            <td>${asignatura.p3 !== undefined ? asignatura.p3.toFixed(1) : 'N/A'}</td>
            <td>${asignatura.ef !== undefined ? asignatura.ef.toFixed(1) : 'N/A'}</td>
            <td class="definitiva-col">${definitiva.toFixed(2)}</td>
            <td><span class="status-badge ${estadoClass}">${estado}</span></td>
        `;
        
        notasBody.appendChild(row);
        
        // Calcular promedio ponderado y estadísticas
        const creditos = parseInt(asignatura.creditos) || 0;
        sumaPonderada += definitiva * creditos;
        totalCreditos += creditos;
        
        if (definitiva >= 3.0) {
            asignaturasAprobadas++;
        }
    });
    
    // Mostrar promedio ponderado
    const promedio = totalCreditos > 0 ? sumaPonderada / totalCreditos : 0;
    document.getElementById('promedio-ponderado').textContent = promedio.toFixed(2);
    document.getElementById('total-creditos').textContent = totalCreditos;
    
    // Actualizar estadísticas
    updateStats(notas);
}

// Actualizar estadísticas
function updateStats(notas) {
    let sumaPonderada = 0;
    let totalCreditos = 0;
    let asignaturasAprobadas = 0;
    
    if (notas && Array.isArray(notas)) {
        notas.forEach(asignatura => {
            const definitiva = calcularDefinitiva(asignatura);
            const creditos = parseInt(asignatura.creditos) || 0;
            sumaPonderada += definitiva * creditos;
            totalCreditos += creditos;
            if (definitiva >= 3.0) {
                asignaturasAprobadas++;
            }
        });
    }
    
    const promedio = totalCreditos > 0 ? sumaPonderada / totalCreditos : 0;
    
    document.getElementById('total-asignaturas').textContent = notas ? notas.length : 0;
    document.getElementById('promedio-general').textContent = promedio.toFixed(2);
    document.getElementById('asignaturas-aprobadas').textContent = asignaturasAprobadas;
}

// Calcular la nota definitiva de una asignatura
function calcularDefinitiva(asignatura) {
    // Verificar que todas las notas existan
    const p1 = asignatura.p1 !== undefined ? asignatura.p1 : 0;
    const p2 = asignatura.p2 !== undefined ? asignatura.p2 : 0;
    const p3 = asignatura.p3 !== undefined ? asignatura.p3 : 0;
    const ef = asignatura.ef !== undefined ? asignatura.ef : 0;
    
    // Calcular promedio simple de las 4 notas
    const suma = p1 + p2 + p3 + ef;
    const cantidadNotas = [p1, p2, p3, ef].filter(nota => nota !== 0).length;
    
    return cantidadNotas > 0 ? suma / cantidadNotas : 0;
}

// Manejar búsqueda
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const rows = document.querySelectorAll('#notas-body tr');
    
    rows.forEach(row => {
        const asignatura = row.cells[0].textContent.toLowerCase();
        if (asignatura.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Manejar cierre de sesión
function handleLogout() {
    // Mostrar confirmación
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        // Eliminar usuario del localStorage
        localStorage.removeItem('user');
        
        // Redirigir a la página de login
        window.location.href = 'index.html';
    }
}

// Función para probar la API (útil para debugging)
async function testAPI() {
    try {
        console.log('Probando conexión con la API...');
        
        // Probar endpoint de estudiantes
        const testResponse = await fetch(`${API_BASE_URL}/students`);
        console.log('Test estudiantes:', testResponse);
        
        if (testResponse.ok) {
            const students = await testResponse.json();
            console.log('Estudiantes disponibles:', students);
        }
        
    } catch (error) {
        console.error('Error en test API:', error);
    }
}

// Ejecutar test al cargar (solo en desarrollo)
// testAPI();