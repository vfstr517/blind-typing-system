const socket = io();

// UI Elements
const activeUsersCount = document.getElementById('active-users-count');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnReset = document.getElementById('btn-reset');
const btnExport = document.getElementById('btn-export');
const monitoringBody = document.getElementById('monitoring-body');

const passageForm = document.getElementById('passage-form');
const newPassageText = document.getElementById('new-passage-text');
const passagesList = document.getElementById('passages-list');

// Socket Events
socket.on('admin:update-users', (users) => {
    activeUsersCount.innerText = users.length;
    renderMonitoringGrid(users);
});

socket.on('admin:error', (err) => {
    alert("Error: " + err);
});

// Fetch Passages
async function loadPassages() {
    const res = await fetch('/api/passages');
    const passages = await res.json();
    
    passagesList.innerHTML = '';
    passages.forEach(p => {
        const div = document.createElement('div');
        div.style.padding = '1rem';
        div.style.background = 'rgba(0,0,0,0.2)';
        div.style.borderRadius = '8px';
        div.style.border = p.active ? '1px solid var(--correct)' : '1px solid transparent';
        div.innerHTML = `
            <p style="font-size: 0.9rem; margin-bottom: 0.5rem; color: #e2e8f0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${p.text}
            </p>
            <div style="display: flex; gap: 0.5rem">
                ${p.active 
                    ? '<span style="color: var(--correct); font-size: 0.8rem; font-weight: bold;">[ACTIVE]</span>' 
                    : `<button onclick="setActivePassage(${p.id})" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; border-radius: 4px;">Set Active</button>`
                }
                <button onclick="deletePassage(${p.id})" class="danger" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; border-radius: 4px;">Delete</button>
            </div>
        `;
        passagesList.appendChild(div);
    });
}

// Passages handlers
passageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = newPassageText.value.trim();
    if(text) {
        await fetch('/api/passages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, active: 1 }) // newly added is auto-active
        });
        newPassageText.value = '';
        loadPassages();
    }
});

window.setActivePassage = async (id) => {
    await fetch(`/api/passages/${id}/active`, { method: 'PUT' });
    loadPassages();
};

window.deletePassage = async (id) => {
    await fetch(`/api/passages/${id}`, { method: 'DELETE' });
    loadPassages();
};

// Admin Commands
btnStart.addEventListener('click', () => {
    if(confirm("Are you sure you want to start the test for all connected users?")) {
        socket.emit('admin:start-test');
    }
});

btnStop.addEventListener('click', () => {
    if(confirm("Force stop the test? Users will be submitted immediately.")) {
        socket.emit('admin:stop-test');
    }
});

btnReset.addEventListener('click', () => {
    if(confirm("This will clear all connected users and reset the database results. Continue?")) {
        socket.emit('admin:reset');
    }
});

// Render the grid
function renderMonitoringGrid(users) {
    monitoringBody.innerHTML = '';
    users.forEach(user => {
        let statusColor = "var(--text-muted)";
        if(user.status === 'typing') statusColor = "var(--accent)";
        if(user.status === 'completed') statusColor = "var(--correct)";

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${user.name}</strong></td>
            <td><span style="font-family: monospace; color: var(--text-muted);">${user.regNumber || 'N/A'}</span></td>
            <td style="color: ${statusColor}; text-transform: capitalize;">${user.status}</td>
            <td style="font-weight: bold; color: var(--accent);">${user.wpm}</td>
            <td>${user.accuracy}%</td>
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem">
                    <div class="progress-bar-bg" style="width: 100px;">
                        <div class="progress-bar-fill" style="width: ${user.progress}%"></div>
                    </div>
                    <span>${user.progress}%</span>
                </div>
            </td>
        `;
        monitoringBody.appendChild(tr);
    });
}

// Export Leaderboard
btnExport.addEventListener('click', async () => {
    try {
        const res = await fetch('/api/results');
        const results = await res.json();
        
        if (results.length === 0) {
            alert("No results to export.");
            return;
        }

        const ws = XLSX.utils.json_to_sheet(results);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Leaderboard");
        XLSX.writeFile(wb, "Typing_Test_Results.xlsx");
    } catch (err) {
        alert("Error exporting: " + err);
    }
});

// Init
loadPassages();
