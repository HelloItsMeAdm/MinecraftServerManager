let listenerWs;

function toggleConsole(server) {
    const consoleDiv = document.getElementById('console');

    if (consoleDiv.style.display === "none") {
        // Show console
        consoleDiv.style.display = "flex";
        document.getElementById('console-title').innerHTML = `Console - ${server}`;

        const consoleContent = document.getElementById('console-content');
        consoleContent.innerHTML = "";
        generateDefaultData(server, consoleContent);

        // Connect to websocket
        listenerWs = new WebSocket(`ws://localhost:8080/${server}`);
        listenerWs.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.action === "log" && data.server === server) {
                const log = document.createElement('p');

                if (data.data.includes('WARN')) {
                    log.classList.add('type-warn');
                } else if (data.data.includes('ERROR')) {
                    log.classList.add('type-error');
                } else if (data.data.includes('FATAL')) {
                    log.classList.add('type-fatal');
                }

                log.innerHTML = data.data;
                consoleContent.appendChild(log);
                updateScroll();
            }
        };
    } else {
        consoleDiv.style.display = "none";
        if (listenerWs) listenerWs.close();
    }
}

function generateDefaultData(server, consoleContent) {
    fetch(`/api/log/${server}`).then((response) => {
        response.json().then((data) => {
            for (const log of data) {
                const logElement = document.createElement('p');

                if (log.includes('WARN')) {
                    logElement.classList.add('type-warn');
                } else if (log.includes('ERROR')) {
                    logElement.classList.add('type-error');
                } else if (log.includes('FATAL')) {
                    logElement.classList.add('type-fatal');
                }

                logElement.innerHTML = log;
                consoleContent.appendChild(logElement);
            }
            updateScroll();
        });
    });
}

function toggleAutoscroll() {
    const autoscroll = document.getElementById('button-autoscroll');
    if (autoscroll.classList.contains('disabled')) {
        autoscroll.classList.remove('disabled');
        const consoleContent = document.getElementById('console-content');
        consoleContent.scrollTop = consoleContent.scrollHeight;
    } else {
        autoscroll.classList.add('disabled');
    }
}

function updateScroll() {
    const autoscroll = document.getElementById('button-autoscroll');
    if (!autoscroll.classList.contains('disabled')) {
        const consoleContent = document.getElementById('console-content');
        consoleContent.scrollTop = consoleContent.scrollHeight;
    }
}

function sendConsoleInput() {
    const input = document.getElementById('console-input');
    const server = document.getElementById('console-title').innerHTML.split(' - ')[1];
    if (input.value === "") return;
    fetch(`/api/console/${server}?command=${input.value}`);
    input.value = "";
}