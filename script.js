// Constantes - Usar URLs absolutas para GitHub Pages
const API_BASE_URL = 'https://24a0dac0-2579-4138-985c-bec2df4bdfcc-00-3unzo70c406dl.riker.replit.dev';
const LOGIN_URL = `${API_BASE_URL}/login`;

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('Página cargada - Verificando autenticación');
    
    // Obtener la página actual de forma segura
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'index.html';
    
    if (currentPage === 'index.html' || currentPage === '' || currentPath.endsWith('/')) {
        console.log('Estamos en la página de login');
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.login === true) {
            console.log('Usuario ya autenticado, redirigiendo a notas');
            // Usar ruta relativa segura para GitHub Pages
            window.location.href = 'notas.html';
        }
        
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
    } else if (currentPage === 'notas.html') {
        console.log('Estamos en la página de notas');
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.login !== true) {
            console.log('No hay usuario autenticado, redirigiendo a login');
            // Usar ruta relativa segura para GitHub Pages
            window.location.href = 'index.html';
            return;
        }
        
        console.log('Usuario autenticado:', user);
        displayUserInfo(user);
        loadNotas(user.codigo);
        
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }
    }
});


// Mostrar información del usuario
function displayUserInfo(user) {
    if (!user || user.login !== true) {
        console.error('Usuario no válido para mostrar información');
        return;
    }
    
    document.getElementById('user-name').textContent = user.nombre || 'Usuario';
    document.getElementById('user-code').textContent = user.codigo || 'N/A';
    
    // Usar nombre seguro para el saludo
    const welcomeName = user.nombre ? user.nombre.split(' ')[0] : 'Estudiante';
    document.getElementById('welcome-name').textContent = welcomeName;
}

// Manejar el envío del formulario de login
async function handleLogin(event) {
    event.preventDefault();
    
    const codigo = document.getElementById('codigo').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    const loginBtn = document.querySelector('.login-btn');
    
    console.log('Intentando login con código:', codigo, 'y contraseña:', password);
    
    // Validaciones básicas
    if (!codigo || !password) {
        showError('Por favor ingresa código y contraseña');
        return;
    }
    
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<div class="loading"></div>';
    loginBtn.disabled = true;
    
    try {
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
        
        console.log('Respuesta login - Status:', response.status);
        
        // Primero obtener el texto de la respuesta
        const responseText = await response.text();
        console.log('Respuesta completa:', responseText);
        
        let result;
        try {
            result = JSON.parse(responseText);
            console.log('Resultado parseado:', result);
        } catch (parseError) {
            console.error('Error parseando JSON:', parseError);
            showError('Error en la respuesta del servidor');
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
            return;
        }
        
        if (response.ok) {
            // VERIFICAR SI EL LOGIN FUE EXITOSO
            if (result.login === true) {
                // Guardar usuario en localStorage
                localStorage.setItem('user', JSON.stringify(result));
                
                loginBtn.innerHTML = '<i class="fas fa-check"></i><span>¡Éxito!</span>';
                loginBtn.classList.add('success-animation');
                
                setTimeout(() => {
                    window.location.href = 'notas.html';
                }, 1000);
            } else {
                // Login fallido - mostrar mensaje específico de la API
                console.error('Login fallido:', result.mensaje);
                showError(result.mensaje || 'Credenciales no válidas');
                loginBtn.innerHTML = originalText;
                loginBtn.disabled = false;
            }
        } else {
            // Error HTTP
            console.error('Error HTTP:', response.status, result);
            showError(result.mensaje || `Error del servidor (${response.status})`);
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
    
    setTimeout(() => {
        document.getElementById('password').value = '';
        errorMessage.style.display = 'none';
    }, 4000);
}

// Cargar las notas del estudiante
async function loadNotas(codigo) {
    console.log('Cargando notas para código:', codigo);
    
    try {
        const notasUrl = `${API_BASE_URL}/students/${codigo}/notas`;
        console.log('URL de notas:', notasUrl);
        
        const response = await fetch(notasUrl);
        console.log('Respuesta de notas - Status:', response.status, 'OK:', response.ok);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Datos completos recibidos de la API:', data);
            
            // VERIFICAR SI LA CONSULTA DE NOTAS FUE EXITOSA
            if (data.login === false) {
                showNotasError(data.mensaje || 'No se pudieron cargar las notas');
                return;
            }
            
            // EXTRAER LAS NOTAS DE LA ESTRUCTURA REAL DE LA API
            const notas = extractNotasFromData(data);
            console.log('Notas extraídas para mostrar:', notas);
            
            if (notas && notas.length > 0) {
                displayNotas(notas);
                updateStats(notas);
            } else {
                showNotasError('No se encontraron notas para este estudiante');
            }
        } else {
            const errorText = await response.text();
            console.error('Error HTTP:', response.status, errorText);
            showNotasError(`Error ${response.status}: No se pudieron cargar las notas`);
        }
    } catch (error) {
        console.error('Error al cargar las notas:', error);
        showNotasError('Error de conexión al cargar las notas: ' + error.message);
    }
}

// Función para extraer notas de la estructura real de la API
function extractNotasFromData(data) {
    console.log('=== EXTRACT NOTAS FROM DATA ===');
    
    // La API devuelve las notas en data.notas
    if (data && data.notas && Array.isArray(data.notas)) {
        console.log('✅ Notas encontradas en data.notas:', data.notas.length, 'elementos');
        return data.notas;
    }
    
    // Si no, buscar en otras propiedades posibles
    if (Array.isArray(data)) {
        console.log('Datos son un array directo con', data.length, 'elementos');
        return data;
    }
    
    console.log('❌ No se pudo extraer array de notas');
    return [];
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
    
    resetStats();
}

// Resetear estadísticas
function resetStats() {
    document.getElementById('total-asignaturas').textContent = '0';
    document.getElementById('promedio-general').textContent = '0.00';
    document.getElementById('asignaturas-aprobadas').textContent = '0';
    document.getElementById('promedio-ponderado').textContent = '0.00';
    document.getElementById('total-creditos').textContent = '0';
}

// Mostrar las notas en la tabla
function displayNotas(notas) {
    const notasBody = document.getElementById('notas-body');
    
    console.log('=== DISPLAY NOTAS ===');
    console.log('Notas a mostrar:', notas);
    
    if (!notas || !Array.isArray(notas) || notas.length === 0) {
        notasBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: var(--light-text); padding: 40px;">
                    <i class="fas fa-book" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>No hay notas registradas para este estudiante.</p>
                </td>
            </tr>
        `;
        resetStats();
        return;
    }
    
    notasBody.innerHTML = '';
    
    let sumaPonderada = 0;
    let totalCreditos = 0;
    let asignaturasAprobadas = 0;
    let hasValidNotas = false;
    
    notas.forEach((asignatura, index) => {
        console.log(`--- Procesando asignatura ${index}: ${asignatura.asignatura} ---`);
        
        // Extraer información básica
        const nombreAsignatura = asignatura.asignatura;
        const creditos = parseInt(asignatura.creditos) || 0;
        
        // EXTRAER NOTAS CON LOS NOMBRES CORRECTOS
        // La API usa: n1, n2, n3, ex
        const notasData = {
            p1: parseFloat(asignatura.n1) || null,
            p2: parseFloat(asignatura.n2) || null,
            p3: parseFloat(asignatura.n3) || null,
            ef: parseFloat(asignatura.ex) || null
        };
        
        console.log('Notas extraídas:', notasData);
        
        const definitiva = calcularDefinitiva(notasData);
        const estado = definitiva >= 3.0 ? 'Aprobado' : 'Reprobado';
        const estadoClass = definitiva >= 3.0 ? 'status-aprobado' : 'status-reprobado';
        
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${nombreAsignatura}</td>
            <td>${creditos}</td>
            <td>${formatNota(notasData.p1)}</td>
            <td>${formatNota(notasData.p2)}</td>
            <td>${formatNota(notasData.p3)}</td>
            <td>${formatNota(notasData.ef)}</td>
            <td class="definitiva-col">${definitiva > 0 ? definitiva.toFixed(2) : 'N/A'}</td>
            <td><span class="status-badge ${estadoClass}">${definitiva > 0 ? estado : 'Sin nota'}</span></td>
        `;
        
        notasBody.appendChild(row);
        
        // Calcular estadísticas si hay notas válidas
        if (definitiva > 0) {
            hasValidNotas = true;
            sumaPonderada += definitiva * creditos;
            totalCreditos += creditos;
            
            if (definitiva >= 3.0) {
                asignaturasAprobadas++;
            }
        }
        
        console.log(`Definitiva: ${definitiva.toFixed(2)}, Estado: ${estado}`);
    });
    
    // Actualizar estadísticas
    updateFinalStats(notas.length, asignaturasAprobadas, sumaPonderada, totalCreditos, hasValidNotas);
}

// Actualizar estadísticas finales
function updateFinalStats(totalAsignaturas, asignaturasAprobadas, sumaPonderada, totalCreditos, hasValidNotas) {
    if (hasValidNotas && totalCreditos > 0) {
        const promedio = sumaPonderada / totalCreditos;
        document.getElementById('promedio-ponderado').textContent = promedio.toFixed(2);
        document.getElementById('total-creditos').textContent = totalCreditos;
        document.getElementById('promedio-general').textContent = promedio.toFixed(2);
    } else {
        document.getElementById('promedio-ponderado').textContent = 'N/A';
        document.getElementById('total-creditos').textContent = '0';
        document.getElementById('promedio-general').textContent = 'N/A';
    }
    
    document.getElementById('total-asignaturas').textContent = totalAsignaturas;
    document.getElementById('asignaturas-aprobadas').textContent = asignaturasAprobadas;
    
    console.log('=== ESTADÍSTICAS FINALES ===');
    console.log('Total asignaturas:', totalAsignaturas);
    console.log('Asignaturas aprobadas:', asignaturasAprobadas);
    console.log('Promedio ponderado:', hasValidNotas ? (sumaPonderada / totalCreditos).toFixed(2) : 'N/A');
    console.log('Total créditos:', totalCreditos);
}

// Formatear nota para mostrar
function formatNota(nota) {
    if (nota === null || nota === undefined) return 'N/A';
    if (nota === 0) return '0.0';
    return nota.toFixed(1);
}

// Calcular la nota definitiva
function calcularDefinitiva(notasData) {
    const { p1, p2, p3, ef } = notasData;
    
    console.log('Calculando definitiva con:', notasData);
    
    // Filtrar notas válidas (no null y mayores a 0)
    const notasValidas = [p1, p2, p3, ef].filter(nota => 
        nota !== null && nota !== undefined && nota > 0
    );
    
    console.log('Notas válidas para cálculo:', notasValidas);
    
    if (notasValidas.length === 0) {
        return 0;
    }
    
    // Calcular promedio simple de las notas disponibles
    const suma = notasValidas.reduce((total, nota) => total + nota, 0);
    const promedio = suma / notasValidas.length;
    
    console.log('Definitiva calculada:', promedio);
    return promedio;
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
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }
}

// Función auxiliar
function updateStats(notas) {
    console.log('Stats actualizadas');
}