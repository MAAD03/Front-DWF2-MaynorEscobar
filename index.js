const API_URL = 'https://dwpf2-maynorescobar-backend.onrender.com/api/tracks';
const STATS_API_URL = 'https://dwpf2-maynorescobar-backend.onrender.com/api/usage-statistics';
const BOARD_ROWS = 4;
const BOARD_COLS = 5;

const qs = id => document.getElementById(id);
const boardEl = qs('board');
const messageEl = qs('message');
const moveListEl = qs('move-list');

let tracks = [];
let currentTrack = null;
let robot = { r: 0, c: 0, dir: 1 }; // dir: 0=up, 1=right, 2=down, 3=left
let moves = [];
let loopOpen = null;
let currentStatId = null;

const key = (r, c) => `${r},${c}`;

const normalizeTrack = t => ({
    idTracks: t.idTracks,
    name: t.name,
    rowsCount: t.rowsCount,
    colsCount: t.colsCount,
    startRow: t.startRow,
    startCol: t.startCol,
    goalRow: t.goalRow,
    goalCol: t.goalCol,
    path: new Set(JSON.parse(t.path).map(([r, c]) => key(r, c)))
});

const loadTracks = async () => {
    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        tracks = (await response.json()).map(normalizeTrack);
    } catch (error) {
        console.error('Error al cargar pistas:', error);
        showMessage('Error al cargar pistas', 'fail');
        tracks = [];
    }
};

const chooseTrackForSession = async () => {
    const chosenTrackId = sessionStorage.getItem('chosenTrackId');
    if (chosenTrackId) {
        try {
            const response = await fetch(`${API_URL}/${chosenTrackId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (response.ok) return normalizeTrack(await response.json());
        } catch (error) {
            console.error('Error al cargar pista seleccionada:', error);
        }
    }
    return tracks[Math.floor(Math.random() * tracks.length)] || null;
};

const startStatistic = async trackId => {
    try {
        const horaInicio = new Date().toISOString();
        const response = await fetch(STATS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                horaInicio,
                idTracks: trackId,
                userIp: '127.0.0.1' // En producción, usar un servicio como api.ipify.org
            })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        const stat = await response.json();
        // Validar que horaInicio sea reciente (dentro de los últimos 5 segundos)
        const receivedHoraInicio = new Date(stat.horaInicio);
        const now = new Date();
        if (Math.abs(now - receivedHoraInicio) > 5000) {
            throw new Error('horaInicio recibida no es válida');
        }
        currentStatId = stat.idEstadisticas;
        showMessage('Estadística iniciada');
    } catch (error) {
        console.error('Error al iniciar estadística:', error);
        showMessage('Error al iniciar estadística', 'fail');
        currentStatId = null;
    }
};

const updateStatistic = async (completedSuccessfully, movesCount) => {
    if (!currentStatId) {
        showMessage('No hay estadística activa', 'fail');
        return;
    }
    try {
        const response = await fetch(`${STATS_API_URL}/${currentStatId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idTracks: currentTrack.idTracks,
                horaFin: new Date().toISOString(),
                completedSuccessfully,
                movesCount,
                userIp: '127.0.0.1'
            })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        console.error('Error al actualizar estadística:', error);
        showMessage('Error al guardar estadística', 'fail');
    }
};

const renderGrid = container => {
    container.innerHTML = '';
    container.style.setProperty('--rows', BOARD_ROWS);
    container.style.setProperty('--cols', BOARD_COLS);

    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            const k = key(r, c);

            if (currentTrack?.path.has(k)) cell.classList.add('path');
            if (currentTrack?.startRow === r && currentTrack.startCol === c) cell.classList.add('start');
            if (currentTrack?.goalRow === r && currentTrack.goalCol === c) cell.classList.add('goal');

            if (robot.r === r && robot.c === c) {
                const rob = document.createElement('div');
                rob.className = 'robot';
                rob.textContent = '🤖';
                rob.style.transform = `rotate(${robot.dir * 90}deg)`;
                cell.appendChild(rob);
            }
            container.appendChild(cell);
        }
    }
};

const resetRobotToStart = () => {
    const s = currentTrack ? { r: currentTrack.startRow, c: currentTrack.startCol } : { r: 0, c: 0 };
    robot = { r: s.r, c: s.c, dir: 1 };
    renderGrid(boardEl);
    showMessage('Robot reiniciado');
};

const showMessage = (text, type = '') => {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
};

const moveLabel = cmd => ({ F: 'Adelante', L: 'Girar Izq', R: 'Girar Der' }[cmd] || cmd);

const renderMoveList = () => {
    moveListEl.innerHTML = '';
    moves.forEach(m => {
        const li = document.createElement('li');
        if (typeof m === 'string') {
            li.textContent = moveLabel(m);
        } else if (m.loop) {
            li.textContent = 'Bucle (x2):';
            const inner = document.createElement('ol');
            m.loop.forEach(it => {
                const sub = document.createElement('li');
                sub.textContent = moveLabel(it);
                inner.appendChild(sub);
            });
            li.appendChild(inner);
        }
        moveListEl.appendChild(li);
    });
};

const addMove = cmd => {
    (loopOpen || moves).push(cmd);
    renderMoveList();
};

const toggleLoop = () => {
    if (loopOpen) {
        loopOpen = null;
        showMessage('Bucle cerrado');
        qs('btn-loop').textContent = 'Iniciar Bucle';
    } else {
        const loopArr = [];
        moves.push({ loop: loopArr });
        loopOpen = loopArr;
        showMessage('Bucle iniciado: añade movimientos');
        qs('btn-loop').textContent = 'Cerrar Bucle';
    }
    renderMoveList();
};

const executeCommand = async cmd => {
    if (cmd === 'L' || cmd === 'R') {
        robot.dir = (robot.dir + (cmd === 'L' ? 3 : 1)) % 4;
        renderGrid(boardEl);
        return true;
    }

    if (cmd === 'F') {
        const dirDelta = [[-1, 0], [0, 1], [1, 0], [0, -1]];
        const [dr, dc] = dirDelta[robot.dir];
        const nr = robot.r + dr, nc = robot.c + dc;

        if (nr < 0 || nr >= BOARD_ROWS || nc < 0 || nc >= BOARD_COLS) {
            showMessage('¡El robot se salió del tablero!', 'fail');
            await sleep(1000);
            resetRobotToStart();
            return false;
        }

        if (!currentTrack.path.has(key(nr, nc))) {
            robot.r = nr;
            robot.c = nc;
            renderGrid(boardEl);
            showMessage('¡El robot se salió del camino!', 'fail');
            await sleep(1000);
            resetRobotToStart();
            return false;
        }

        robot.r = nr;
        robot.c = nc;
        renderGrid(boardEl);
    }
    return true;
};

const sleep = ms => new Promise(res => setTimeout(res, ms));

qs('btn-execute').addEventListener('click', async () => {
    if (loopOpen) return showMessage('Cierre el bucle antes de ejecutar', 'fail');
    if (!currentTrack) return showMessage('No hay pista cargada', 'fail');
    if (!currentStatId) {
        await startStatistic(currentTrack.idTracks);
        if (!currentStatId) return showMessage('No se pudo iniciar estadística', 'fail');
    }

    const flat = [];
    const expand = arr => arr.forEach(it => typeof it === 'string' ? flat.push(it) : it.loop && expand(it.loop) && expand(it.loop));
    expand(moves);

    for (const cmd of flat) {
        if (!(await executeCommand(cmd))) {
            await updateStatistic(false, flat.length);
            return;
        }
        await sleep(300);
    }

    const completed = robot.r === currentTrack.goalRow && robot.c === currentTrack.goalCol;
    showMessage(completed ? '¡Misión cumplida!' : 'Inténtalo de nuevo', completed ? 'success' : 'fail');
    await updateStatistic(completed, flat.length);
});

[['btn-forward', 'F'], ['btn-left', 'L'], ['btn-right', 'R']].forEach(([id, cmd]) =>
    qs(id).addEventListener('click', () => addMove(cmd))
);

qs('btn-loop').addEventListener('click', toggleLoop);

qs('btn-clear-moves').addEventListener('click', () => {
    moves = [];
    loopOpen = null;
    renderMoveList();
    qs('btn-loop').textContent = 'Iniciar Bucle';
    showMessage('Movimientos limpiados');
});

qs('btn-reiniciar').addEventListener('click', async () => {
    if (currentStatId) await updateStatistic(false, moves.length);
    resetRobotToStart();
    moves = [];
    renderMoveList();
    if (currentTrack) await startStatistic(currentTrack.idTracks);
    showMessage('Reiniciado');
});

const init = async () => {
    await loadTracks();
    currentTrack = await chooseTrackForSession();
    if (currentTrack) await startStatistic(currentTrack.idTracks);
    resetRobotToStart();
    renderMoveList();
    showMessage('¡Bienvenido a Codifica con Guali! Agrega movimientos y ejecuta.');
};

init();