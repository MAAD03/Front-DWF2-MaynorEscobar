const API_URL = 'https://dwpf2-maynorescobar-backend.onrender.com/api/tracks';
const EXPORT_API_URL = 'https://dwpf2-maynorescobar-backend.onrender.com/api/track-exports';
const BOARD_ROWS = 4;
const BOARD_COLS = 5;

const qs = id => document.getElementById(id);
const adminBoardEl = qs('admin-board');
const trackSelect = qs('track-select');
let tracks = [];
let editable = null;

const key = (r, c) => `${r},${c}`;

function normalizeTrack(t) {
    return {
        idTracks: t.idTracks,
        name: t.name,
        rowsCount: t.rowsCount,
        colsCount: t.colsCount,
        startRow: t.startRow,
        startCol: t.startCol,
        goalRow: t.goalRow,
        goalCol: t.goalCol,
        path: new Set(JSON.parse(t.path).map(([r, c]) => key(r, c))),
        idAdmin: t.idAdmin || null
    };
}

async function loadTracks() {
    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (response.ok) {
            tracks = (await response.json()).map(normalizeTrack);
            populateTrackSelect();
        } else {
            alert('Error al cargar pistas');
        }
    } catch (error) {
        console.error('Error en la solicitud:', error);
        alert('Error en la conexión con el servidor');
    }
}

function populateTrackSelect() {
    trackSelect.innerHTML = '';
    tracks.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.idTracks;
        opt.textContent = t.name;
        trackSelect.appendChild(opt);
    });
}

function renderGrid(container, track) {
    container.innerHTML = '';
    container.style.setProperty('--rows', BOARD_ROWS);
    container.style.setProperty('--cols', BOARD_COLS);

    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            const k = key(r, c);

            if (track.path.has(k)) cell.classList.add('path');
            if (track.startRow === r && track.startCol === c) cell.classList.add('start');
            if (track.goalRow === r && track.goalCol === c) cell.classList.add('goal');

            cell.addEventListener('click', () => {
                const mode = qs('config-mode').value;
                if (mode === 'path') {
                    track.path.has(k) ? track.path.delete(k) : track.path.add(k);
                }
                if (mode === 'start') {
                    track.startRow = r;
                    track.startCol = c;
                }
                if (mode === 'goal') {
                    track.goalRow = r;
                    track.goalCol = c;
                }
                renderGrid(container, track);
            });

            container.appendChild(cell);
        }
    }
}

qs('btn-load-track').addEventListener('click', async () => {
    const id = trackSelect.value;
    if (!id) return alert('Seleccione una pista para cargar.');
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (response.ok) {
            editable = normalizeTrack(await response.json());
            renderGrid(adminBoardEl, editable);
        } else {
            alert('Error al cargar la pista');
        }
    } catch (error) {
        console.error('Error en la solicitud:', error);
        alert('Error en la conexión con el servidor');
    }
});

qs('btn-new-track').addEventListener('click', () => {
    editable = {
        idTracks: null,
        name: `Pista-${Date.now()}`,
        rowsCount: BOARD_ROWS,
        colsCount: BOARD_COLS,
        startRow: 0,
        startCol: 0,
        goalRow: 0,
        goalCol: 1,
        path: new Set(),
        idAdmin: null
    };
    renderGrid(adminBoardEl, editable);
});

qs('btn-save-track').addEventListener('click', async () => {
    if (!editable) return alert('No hay pista para guardar.');
    const name = prompt('Nombre de la pista:', editable.name) || editable.name;
    editable.name = name;

    const payload = {
        idTracks: editable.idTracks,
        name: editable.name,
        rowsCount: BOARD_ROWS,
        colsCount: BOARD_COLS,
        startRow: editable.startRow,
        startCol: editable.startCol,
        goalRow: editable.goalRow,
        goalCol: editable.goalCol,
        path: JSON.stringify([...editable.path].map(k => k.split(',').map(Number))),
        idAdmin: editable.idAdmin || null
    };

    try {
        const method = editable.idTracks ? 'PUT' : 'POST';
        const url = editable.idTracks ? `${API_URL}/${editable.idTracks}` : API_URL;
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            await loadTracks();
            sessionStorage.setItem('chosenTrackId', (await response.json()).idTracks || editable.idTracks);
            alert('Pista guardada correctamente.');
        } else {
            alert('Error al guardar la pista');
        }
    } catch (error) {
        console.error('Error en la solicitud:', error);
        alert('Error en la conexión con el servidor');
    }
});

qs('btn-delete-track').addEventListener('click', async () => {
    const id = trackSelect.value;
    if (!id) return alert('Seleccione una pista para eliminar.');
    if (!confirm('¿Seguro que desea eliminar esta pista?')) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (response.ok) {
            await loadTracks();
            editable = null;
            adminBoardEl.innerHTML = '';
            alert('Pista eliminada correctamente.');
        } else {
            alert('Error al eliminar la pista');
        }
    } catch (error) {
        console.error('Error en la solicitud:', error);
        alert('Error en la conexión con el servidor');
    }
});

qs('btn-export-track').addEventListener('click', async () => {
    const id = trackSelect.value;
    if (!id) return alert('Seleccione una pista para exportar.');
    
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (!response.ok) return alert('Error al cargar la pista para exportar.');

        const track = await response.json();
        const exportData = {
            name: track.name,
            rowsCount: track.rowsCount,
            colsCount: track.colsCount,
            startRow: track.startRow,
            startCol: track.startCol,
            goalRow: track.goalRow,
            goalCol: track.goalCol,
            path: JSON.parse(track.path)
        };
        const exportJson = JSON.stringify(exportData, null, 2);
        const fileName = `track_${track.name}_${new Date().toISOString().replace(/[:.]/g, '')}.json`;

        // Log export to track_exports
        await fetch(EXPORT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                exportData: exportJson,
                exportFormat: 'JSON',
                fileName: fileName,
                idAdmin: null,
                idTracks: track.idTracks
            })
        });

        // Trigger download
        const blob = new Blob([exportJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        alert('Pista exportada correctamente.');
    } catch (error) {
        console.error('Error en la exportación:', error);
        alert('Error en la conexión con el servidor');
    }
});

qs('btn-import-track').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.name || !data.rowsCount || !data.colsCount || 
                    data.startRow == null || data.startCol == null || 
                    data.goalRow == null || data.goalCol == null || !Array.isArray(data.path)) {
                    return alert('Formato de archivo inválido.');
                }

                const payload = {
                    name: data.name,
                    rowsCount: data.rowsCount,
                    colsCount: data.colsCount,
                    startRow: data.startRow,
                    startCol: data.startCol,
                    goalRow: data.goalRow,
                    goalCol: data.goalCol,
                    path: JSON.stringify(data.path),
                    idAdmin: null
                };

                // Create new track
                const trackResponse = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                });

                if (!trackResponse.ok) return alert('Error al importar la pista.');

                const newTrack = await trackResponse.json();
                
                // Log import to track_exports
                await fetch(EXPORT_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        exportData: JSON.stringify(payload),
                        exportFormat: 'JSON',
                        fileName: file.name,
                        idAdmin: null,
                        idTracks: newTrack.idTracks
                    })
                });

                await loadTracks();
                alert('Pista importada correctamente.');
            } catch (error) {
                console.error('Error al procesar el archivo:', error);
                alert('Error al procesar el archivo JSON.');
            }
        };
        reader.readAsText(file);
    } catch (error) {
        console.error('Error en la importación:', error);
        alert('Error en la conexión con el servidor');
    }
});

async function init() {
    await loadTracks();
    if (tracks.length) {
        editable = { ...tracks[0], path: new Set(tracks[0].path) };
        renderGrid(adminBoardEl, editable);
    }
}

init();