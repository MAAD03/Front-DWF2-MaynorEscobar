const API_URL = 'https://dwpf2-maynorescobar-backend.onrender.com/api';
const STATS_API_URL = `${API_URL}/usage-statistics`;
const TRACKS_API_URL = `${API_URL}/tracks`;

const qs = id => document.getElementById(id);
const messageEl = qs('message');

const loadStatistics = async () => {
    try {
        const statsResponse = await fetch(STATS_API_URL, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!statsResponse.ok) throw new Error(`HTTP ${statsResponse.status}`);
        const stats = await statsResponse.json();

        const tracksResponse = await fetch(TRACKS_API_URL, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const tracks = tracksResponse.ok ? await tracksResponse.json() : [];
        const trackMap = new Map(tracks.map(t => [t.idTracks, t.name]));

        return stats.map(stat => ({
            ...stat,
            trackName: trackMap.get(stat.idTracks) || 'Desconocida',
            totalTime: stat.horaFin ? 
                Math.floor((new Date(stat.horaFin) - new Date(stat.horaInicio)) / 1000) : null
        }));
    } catch (error) {
        console.error('Error en la solicitud:', error);
        messageEl.textContent = 'Error en la conexión con el servidor';
        messageEl.className = 'message fail';
        return [];
    }
};

const formatTime = seconds => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const displayStatistics = stats => {
    const container = qs('stats-container');
    container.innerHTML = '';
    messageEl.textContent = '';

    // Filtrar solo las estadísticas con completedSuccessfully = true
    const completedStats = stats.filter(stat => stat.completedSuccessfully);

    if (completedStats.length === 0) {
        messageEl.textContent = 'No hay partidas completadas disponibles.';
        messageEl.className = 'message';
        return;
    }

    // Agrupar estadísticas por idTracks
    const groupedByTrack = completedStats.reduce((acc, stat) => {
        if (!acc[stat.idTracks]) {
            acc[stat.idTracks] = {
                trackName: stat.trackName,
                stats: []
            };
        }
        acc[stat.idTracks].stats.push(stat);
        return acc;
    }, {});

    // Ordenar pistas por nombre
    Object.entries(groupedByTrack)
        .sort((a, b) => a[1].trackName.localeCompare(b[1].trackName))
        .forEach(([idTracks, group]) => {
            const trackHeader = document.createElement('h4');
            trackHeader.textContent = `Pista: ${group.trackName} (ID: ${idTracks})`;
            trackHeader.className = 'track-header';
            container.appendChild(trackHeader);

            const table = document.createElement('table');
            table.className = 'admin-table';
            table.innerHTML = `
                <thead>
                    <tr class="table-header">
                        <th>ID</th>
                        <th>Fin</th>
                        <th>Éxito</th>
                        <th>Movimientos</th>
                    </tr>
                </thead>
                <tbody>
                    ${group.stats.map(stat => `
                        <tr>
                            <td class="table-cell">${stat.idEstadisticas}</td>
                            <td class="table-cell">${stat.horaFin ? new Date(stat.horaFin).toLocaleString() : 'N/A'}</td>
                            <td class="table-cell">${stat.completedSuccessfully ? 'Sí' : 'No'}</td>
                            <td class="table-cell">${stat.movesCount}</td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
            container.appendChild(table);
        });
};

document.addEventListener('DOMContentLoaded', async () => {
    const stats = await loadStatistics();
    displayStatistics(stats);

    // Botón para recargar estadísticas
    const reloadButton = document.createElement('button');
    reloadButton.textContent = 'Recargar Estadísticas';
    reloadButton.className = 'button';
    reloadButton.addEventListener('click', async () => {
        const stats = await loadStatistics();
        displayStatistics(stats);
    });
    qs('controls').prepend(reloadButton);
});