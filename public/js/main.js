/*
TODO:
- Reconnect - recall all
- Multi listen fix
- Console log for different server fix
- Setting for plugin copy
- Nice logging
*/
let ws;
let wsDiv;

document.addEventListener('DOMContentLoaded', function() {
    // start ws
    ws = new WebSocket('ws://localhost:8080');
    wsDiv = document.getElementById('ws');
    ws.onopen = () => {
        wsDiv.style.display = "none";
    };
    ws.onclose = () => {
        wsDiv.style.display = "flex";

        function wsReconnect() {
            ws = new WebSocket('ws://localhost:8080');
            ws.onopen = () => {
                wsDiv.style.display = "none";
            };
            ws.onclose = () => {
                wsDiv.style.display = "flex";
                setTimeout(wsReconnect, 1000);
            };
        }
        setTimeout(wsReconnect, 1000);
    };
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateWidgets(data);
    };
    // fetch default data
    fetch('/api/config').then((response) => {
        response.json().then((data) => {
            for (const server in data) {
                addElement(data[server], server, data.length);
            }
            fetch('/api/status').then((response) => {
                response.json().then((data) => {
                    for (const server in data) {
                        updateWidgets({
                            server: server,
                            action: "status",
                            data: data[server].status
                        });
                        updateWidgets({
                            server: server,
                            action: "players",
                            data: {
                                players: data[server].players,
                                maxPlayers: data[server].maxPlayers
                            }
                        });
                    }
                });
            });
        });
    });
    // Listener for RAM changer
    document.addEventListener('input', function(event) {
        if (event.target.type === 'range') {
            document.getElementById(`${event.target.id.split('-')[0]}-setting-ram`).innerHTML = `${parseInt(event.target.value).toFixed(1)} GB`;
        }
    });
    // Listener for Update button
    document.addEventListener('click', function(event) {
        if (event.target.id.includes('-update-ram')) {
            const server = event.target.id.split('-')[0];
            const ram = document.getElementById(`${server}-select-ram`).value;
            updateRam(server, ram);
        }
    });
    // listen for enter in console-input
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            sendConsoleInput();
        }
    });
    // add close listener for console on ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && document.getElementById('console').style.display !== "none") {
            toggleConsole();
        }
    });
    // add close listener for console on click outside
    document.addEventListener('click', function(event) {
        if (event.target.id === 'console' && document.getElementById('console').style.display !== "none") {
            toggleConsole();
        }
    });
});

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
}

function updateRam(server, ram) {
    fetch(`/api/update/${server}?ram=${ram * 1024}`);
}

function addElement(data, serverName, totalServers) {
    serverList = document.getElementById('server-list');
    newServer = document.createElement('div');
    newServer.classList.add('server');
    if (totalServers % 2 == 1) {
        newServer.classList.add('max3');
    } else {
        newServer.classList.add('max2');
    }
    newServer.innerHTML = `
    <div class="server-header">
        <h3>${data["version"]}</h3>
        <div class="right">
            <p class="status-badge offline" id="${serverName}-status">Offline</p>
            <p class="status-badge players" id="${serverName}-players">0 / 0</p>
        </div>
    </div>
    <div class="server-body">
        <h2 class="underline">${serverName}</h2>
        <p>
            <span onclick="copyToClipboard('localhost:${data["port"]}')" class="server-ip" id="${serverName}-ip">localhost:${data["port"]}</span> | Click to copy!
        </p>
        <div class="server-ram">
            <h2 class="underline">RAM</h2>
            <p id="${serverName}-ram"><strong>Current:</strong> ${mbTOgb(data["ram"])} GB</p>
            <form id="${serverName}-form">
                <p id="${serverName}-setting-ram">${mbTOgb(data["ram"])} GB</p>
                <input type="range" id="${serverName}-select-ram" min="1" max="16" value="${mbTOgb(data["ram"])}">
                <input type="submit" value="Update" id="${serverName}-update-ram">
            </form>
        </div>
    </div>
    <div class="server-footer">
        <button onclick="toggleConsole('${serverName}')" id="${serverName}-button-console"><i class="fa fa-solid fa-terminal"></i></button>
        <button onclick="sendAction('${serverName}', 'start')" id="${serverName}-button-start"><i class="fa fa-solid fa-play"></i></button>
        <button onclick="sendAction('${serverName}', 'stop')" disabled id="${serverName}-button-stop"><i class="fa fa-solid fa-stop"></i></button>
        <button onclick="sendAction('${serverName}', 'restart')" disabled id="${serverName}-button-restart"><i
                class="fa fa-solid fa-rotate-right"></i></button>
        <button onclick="sendAction('${serverName}', 'forceStop')" class="server-button-forceStop"><i
                class="fa fa-solid fa-ban"></i></button>
    </div>`;
    serverList.appendChild(newServer);
}

function mbTOgb(mb) {
    return (mb / 1024).toFixed(1);
}

function sendAction(server, action) {
    fetch(`/api/control/${server}/${action}`);
}

function updateWidgets(data) {
    if (data.action === "status") {
        const status = document.getElementById(`${data.server}-status`);
        status.className = "status-badge";
        if (data.data === "Online") {
            status.classList.add("online");
            document.getElementById(`${data.server}-button-start`).disabled = true;
            document.getElementById(`${data.server}-button-stop`).disabled = false;
            document.getElementById(`${data.server}-button-restart`).disabled = false;
            document.getElementById(`${data.server}-select-ram`).disabled = true;
            document.getElementById(`${data.server}-update-ram`).disabled = true;
        } else if (data.data === "Offline") {
            status.classList.add("offline");
            document.getElementById(`${data.server}-button-start`).disabled = false;
            document.getElementById(`${data.server}-button-stop`).disabled = true;
            document.getElementById(`${data.server}-button-restart`).disabled = true;
            document.getElementById(`${data.server}-select-ram`).disabled = false;
            document.getElementById(`${data.server}-update-ram`).disabled = false;
        } else if (data.data === "Starting..." || data.data === "Restarting..." || data.data === "Stopping...") {
            status.classList.add("working");
            document.getElementById(`${data.server}-button-start`).disabled = true;
            document.getElementById(`${data.server}-button-stop`).disabled = true;
            document.getElementById(`${data.server}-button-restart`).disabled = true;
            document.getElementById(`${data.server}-select-ram`).disabled = true;
            document.getElementById(`${data.server}-update-ram`).disabled = true;
        }
        status.innerHTML = data.data;
    } else if (data.action === "players") {
        document.getElementById(`${data.server}-players`).innerHTML = `${data.data.players} / ${data.data.maxPlayers}`;
    }
}