// Crear curso - SOLUCIÓN 1: Recarga la página
document.getElementById('createCursoForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = new FormData(this);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch('/admin/cursos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            const modalCreate = bootstrap.Modal.getInstance(document.getElementById('createCursoModal'));
            if (modalCreate) modalCreate.hide();

            showAlert('success', 'Curso creado exitosamente. Recargando para mostrar el nuevo curso...');
            
            // Recargar la página después de 1 segundo para ver el nuevo curso
            setTimeout(() => location.reload(), 1000);
        } else {
            showAlert('danger', result.message || 'No se pudo crear el curso');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('danger', 'Error al crear el curso: ' + error.message);
    }
});

// Ver curso
async function viewCurso(id) {
    try {
        const response = await fetch(`/admin/cursos/${id}`);
        const result = await response.json();
        
        if (result.success) {
            const curso = result.curso;
            document.getElementById('viewCursoContent').innerHTML = `
                <div class="row g-3">
                    ${curso.miniatura ? `
                    <div class="col-12 text-center">
                        <img src="${curso.miniatura}" alt="${curso.titulo}" class="img-fluid rounded" style="max-height: 200px;">
                    </div>
                    ` : ''}
                    <div class="col-md-8">
                        <h4>${curso.titulo}</h4>
                        <p class="text-muted">${curso.descripcion || 'Sin descripción'}</p>
                    </div>
                    <div class="col-md-4">
                        <h6>Información Básica</h6>
                        <p><strong>Categoría:</strong> ${curso.categoria_nombre}</p>
                        <p><strong>Instructor:</strong> ${curso.instructor_completo}</p>
                        <p><strong>Precio:</strong> $${curso.precio}</p>
                        <p><strong>Nivel:</strong> ${curso.nivel}</p>
                        <p><strong>Estado:</strong> <span class="badge status-${curso.estatus}">${curso.estatus}</span></p>
                    </div>
                    <div class="col-12">
                        <h6>Estadísticas</h6>
                        <div class="stats-row">
                            <div class="stat-item-box stat-modulos">
                                <i class="bi bi-collection"></i>
                                <strong>${curso.total_modulos}</strong>
                                <small>Módulos</small>
                            </div>
                            <div class="stat-item-box stat-videos">
                                <i class="bi bi-play-circle"></i>
                                <strong>${curso.total_videos}</strong>
                                <small>Videos</small>
                            </div>
                            <div class="stat-item-box stat-valoraciones">
                                <i class="bi bi-star-fill"></i>
                                <strong>${curso.promedio_valoracion_display}</strong>
                                <small>Rating</small>
                            </div>
                            <div class="stat-item-box stat-compras">
                                <i class="bi bi-cart-check"></i>
                                <strong>${curso.total_compras}</strong>
                                <small>Ventas</small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            const modal = new bootstrap.Modal(document.getElementById('viewCursoModal'));
            modal.show();
        } else {
            showAlert('danger', result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('danger', 'Error al obtener los detalles del curso');
    }
}

// Editar curso
async function editCurso(id) {
    try {
        const response = await fetch(`/admin/cursos/${id}`);
        const result = await response.json();
        
        if (result.success) {
            const curso = result.curso;
            
            document.getElementById('edit_id_curso').value = curso.id_curso;
            document.getElementById('edit_titulo').value = curso.titulo;
            document.getElementById('edit_descripcion').value = curso.descripcion || '';
            document.getElementById('edit_categoria').value = curso.id_categoria;
            document.getElementById('edit_precio').value = curso.precio;
            document.getElementById('edit_nivel').value = curso.nivel;
            document.getElementById('edit_estatus').value = curso.estatus;
            document.getElementById('edit_id_instructor').value = curso.id_instructor;
            document.getElementById('edit_miniatura').value = curso.miniatura || '';
            
            const modal = new bootstrap.Modal(document.getElementById('editCursoModal'));
            modal.show();
        } else {
            showAlert('danger', result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('danger', 'Error al obtener los datos del curso');
    }
}

document.getElementById('editCursoForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    const id = data.id_curso;
    
    try {
        const response = await fetch(`/admin/cursos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('success', result.message);
            bootstrap.Modal.getInstance(document.getElementById('editCursoModal')).hide();
            setTimeout(() => location.reload(), 1500);
        } else {
            showAlert('danger', result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('danger', 'Error al actualizar el curso');
    }
});

// Cambiar estado del curso
async function changeStatus(id, newStatus, titulo) {
    const statusNames = {
        'publicado': 'publicar',
        'borrador': 'marcar como borrador',
        'inactivo': 'desactivar'
    };
    
    if (confirm(`¿Estás seguro de que deseas ${statusNames[newStatus]} el curso "${titulo}"?`)) {
        try {
            const response = await fetch(`/admin/cursos/${id}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ estatus: newStatus })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showAlert('success', result.message);
                setTimeout(() => location.reload(), 1500);
            } else {
                showAlert('danger', result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('danger', 'Error al cambiar el estado del curso');
        }
    }
}

// Eliminar curso
function deleteCurso(id, titulo, totalCompras) {
    if (totalCompras > 0) {
        showAlert('warning', `No se puede eliminar el curso "${titulo}" porque tiene ${totalCompras} compra(s) asociada(s).`);
        return;
    }
    
    if (confirm(`¿Estás seguro de que deseas eliminar el curso "${titulo}"?\n\nEsta acción eliminará también todos los módulos y videos asociados y no se puede deshacer.`)) {
        fetch(`/admin/cursos/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('success', data.message);
                setTimeout(() => location.reload(), 1500);
            } else {
                showAlert('danger', data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('danger', 'Error al eliminar el curso');
        });
    }
}

// Función para mostrar alertas
function showAlert(type, message) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Cargar módulos al seleccionar un curso en el modal de agregar video
document.getElementById('video_curso').addEventListener('change', function() {
    loadModulosForCurso(this.value);
});

// Crear video
document.getElementById('createVideoForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const formData = new FormData(this);
  const data = Object.fromEntries(formData);
  
  try {
      const response = await fetch('/admin/videos', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (result.success) {
          showAlert('success', result.message);
          bootstrap.Modal.getInstance(document.getElementById('createVideoModal')).hide();
          setTimeout(() => location.reload(), 1500);
      } else {
          showAlert('danger', result.message);
      }
  } catch (error) {
      console.error('Error:', error);
      showAlert('danger', 'Error al crear el video');
  }
});

let cachedModulos = [];

function openCreateVideoModal(idCurso) {
    const modalEl = document.getElementById('createVideoModal');
    const selectCurso = document.getElementById('video_curso');
    const selectModulo = document.getElementById('video_modulo');
    const createSection = document.getElementById('createModuloSection');

    // Reset UI
    createSection.classList.add('d-none');
    document.getElementById('nuevo_modulo_titulo').value = '';
    selectModulo.innerHTML = '<option value="">Seleccione un módulo...</option>';

    // Preseleccionar curso
    if (idCurso) selectCurso.value = String(idCurso);

    // Cargar módulos
    loadModulosForCurso(selectCurso.value);

    // Al cambiar de curso, recargar módulos y ocultar creación
    selectCurso.onchange = () => {
        createSection.classList.add('d-none');
        loadModulosForCurso(selectCurso.value);
    };

    // Toggle sección crear módulo
    document.getElementById('toggleCreateModuloBtn').onclick = () => {
        const visible = !createSection.classList.contains('d-none');
        createSection.classList.toggle('d-none', visible);
        if (!visible) {
            // focus the module title
            document.getElementById('nuevo_modulo_titulo').focus();
        }
    };

    // Crear módulo inline (comportamiento intermedio):
    // - Si el usuario no pone título, se genera "Módulo {n}"
    // - El orden se calcula automáticamente usando guessNextOrden()
    document.getElementById('createModuloBtn').onclick = async () => {
        const idCursoSel = selectCurso.value;
        let titulo = document.getElementById('nuevo_modulo_titulo').value.trim();

        if (!idCursoSel) { showAlert('warning', 'Selecciona un curso primero'); return; }

        // Calcular orden automáticamente
        const orden = guessNextOrden();

        // Si no hay título, generar uno por defecto
        if (!titulo) {
            titulo = `Módulo ${orden}`;
        }

        try {
            const res = await fetch(`/admin/cursos/${idCursoSel}/modulos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titulo, orden })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'No se pudo crear el módulo');

            // Recargar módulos y preseleccionar el nuevo
            await loadModulosForCurso(idCursoSel);
            if (data.modulo?.id_modulo) {
                document.getElementById('video_modulo').value = String(data.modulo.id_modulo);
            }
            document.getElementById('createModuloSection').classList.add('d-none');
            showAlert('success', 'Módulo creado');
        } catch (e) {
            console.error(e);
            showAlert('danger', e.message || 'Error al crear el módulo');
        }
    };

    new bootstrap.Modal(modalEl).show();
}

async function loadModulosForCurso(idCurso) {
    const selectModulo = document.getElementById('video_modulo');
    if (!idCurso) {
        selectModulo.innerHTML = '<option value="">Seleccione un curso primero</option>';
        return;
    }
    selectModulo.innerHTML = '<option value="">Cargando módulos...</option>';
    try {
        const res = await fetch(`/admin/cursos/${idCurso}/modulos`);
        let data;
        try {
            data = await res.json();
        } catch (jsonErr) {
            // Response wasn't JSON (maybe an HTML error page)
            const text = await res.text();
            throw new Error('Respuesta inesperada del servidor al cargar módulos: ' + (text.slice(0,200)));
        }
        if (!data.success) throw new Error(data.message || 'No se pudieron cargar los módulos');

        cachedModulos = Array.isArray(data.modulos) ? data.modulos : [];
        if (cachedModulos.length === 0) {
            selectModulo.innerHTML = '<option value="">No hay módulos en este curso, crea uno nuevo</option>';
            // Abrir automáticamente la creación
            document.getElementById('createModuloSection').classList.remove('d-none');
            // El orden se calculará automáticamente cuando se cree el módulo
            return;
        }

        cachedModulos.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
        selectModulo.innerHTML = cachedModulos
            .map(m => `<option value="${m.id_modulo}">#${m.orden} - ${m.titulo}</option>`)
            .join('');
    } catch (e) {
        console.error(e);
        selectModulo.innerHTML = '<option value="">Error al cargar módulos</option>';
        showAlert('danger', 'Error al cargar los módulos del curso: ' + (e.message || 'comprueba el servidor'));
    }
}

// Abre el modal de "Agregar Video" y muestra la sección de crear módulo activada
function openCreateModuloModal(idCurso) {
    // Reuse the video modal but open with the create-module section visible
    openCreateVideoModal(idCurso);
    // after modal is shown, ensure create section is visible
    setTimeout(() => {
        const createSection = document.getElementById('createModuloSection');
        if (createSection) createSection.classList.remove('d-none');
        // focus the module title
        const titulo = document.getElementById('nuevo_modulo_titulo');
        if (titulo) titulo.focus();
    }, 250);
}

function guessNextOrden() {
    if (!cachedModulos || cachedModulos.length === 0) return 1;
    return Math.max(...cachedModulos.map(m => m.orden || 0)) + 1;
}

document.getElementById('createVideoForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    let payload = Object.fromEntries(formData);

    // Validación: id_modulo requerido
    if (!payload.id_modulo) {
        // Si está visible la creación de módulo y tiene título, creamos primero
        const createSectionVisible = !document.getElementById('createModuloSection').classList.contains('d-none');
        const tituloNuevo = document.getElementById('nuevo_modulo_titulo')?.value.trim();
        if (createSectionVisible) {
            const idCursoSel = document.getElementById('video_curso').value;
            // calcular orden y título si es necesario
            const ordenNuevo = guessNextOrden();
            const tituloGenerado = tituloNuevo || `Módulo ${ordenNuevo}`;
            try {
                const res = await fetch(`/admin/cursos/${idCursoSel}/modulos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ titulo: tituloGenerado, orden: ordenNuevo })
                });
                const data = await res.json();
                if (!data.success || !data.modulo?.id_modulo) throw new Error(data.message || 'No se pudo crear el módulo');
                // Actualizar select y payload
                await loadModulosForCurso(idCursoSel);
                document.getElementById('video_modulo').value = String(data.modulo.id_modulo);
                payload.id_modulo = String(data.modulo.id_modulo);
            } catch (err) {
                showAlert('danger', err.message || 'Error al crear el módulo');
                return;
            }
        } else {
            showAlert('warning', 'Selecciona un módulo o crea uno nuevo');
            return;
        }
    }

    try {
        const res = await fetch('/admin/videos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            showAlert('success', 'Video creado correctamente');
            bootstrap.Modal.getInstance(document.getElementById('createVideoModal')).hide();
            setTimeout(() => location.reload(), 1200);
        } else {
            showAlert('danger', data.message || 'No se pudo crear el video');
        }
    } catch (e) {
        console.error(e);
        showAlert('danger', 'Error al crear el video');
    }
});

// --- Lógica del Interruptor de Vista (Tabla/Rejilla) ---
const viewToggleTable = document.getElementById('view-toggle-table');
const viewToggleGrid = document.getElementById('view-toggle-grid');
const tableView = document.getElementById('table-view-container');
const gridView = document.getElementById('grid-view-container');
const viewPreference = localStorage.getItem('adminCursoView');

function setView(view) {
    if (view === 'grid') {
        // Mostrar Rejilla
        tableView.classList.add('d-none');
        gridView.classList.remove('d-none');
        // Actualizar botones
        viewToggleGrid.classList.add('active');
        viewToggleTable.classList.remove('active');
        // Guardar preferencia
        localStorage.setItem('adminCursoView', 'grid');
    } else {
        // Mostrar Tabla
        gridView.classList.add('d-none');
        tableView.classList.remove('d-none');
        // Actualizar botones
        viewToggleTable.classList.add('active');
        viewToggleGrid.classList.remove('active');
        // Guardar preferencia
        localStorage.setItem('adminCursoView', 'table');
    }
}

// Añadir listeners
viewToggleTable.addEventListener('click', () => setView('table'));
viewToggleGrid.addEventListener('click', () => setView('grid'));

// Aplicar preferencia al cargar la página
if (viewPreference === 'grid') {
    setView('grid');
} else {
    setView('table'); // Por defecto es tabla
}