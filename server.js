process.chdir(__dirname);
const express = require('express');
const app = express();
const start = require('child_process').spawn;
const jsonfile = require('jsonfile');
let config = require('./config.json');
config = jsonfile.readFileSync('./config.json');
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
const Rcon = require('rcon-client').Rcon;
const kill = require('tree-kill');
const net = require('net');
const fs = require('fs');

let serverProcess = {};
let serverStatuses = {};
let serverLogs = {};
let devProcess = [];

// return config file
const apiProxy = express.Router();
apiProxy.get('/api/config', (_req, res) => {
    res.json(config);
});
// handle all server actions
apiProxy.get('/api/control/:server/:action', (req, res) => {
    serverControl(req.params.server, req.params.action, req.query.ram);
    res.send('ok');
});
// update server ram
apiProxy.get('/api/update/:server', (req, _res) => {
    // get all params
    let params = req.query;
    for (const param in params) {
        // check if param is a number
        if (!isNaN(params[param])) {
            params[param] = parseInt(params[param]);
        }
        // check if param is a boolean
        if (params[param] == 'true') {
            params[param] = true;
        } else if (params[param] == 'false') {
            params[param] = false;
        }

        config[req.params.server][param] = params[param];
        jsonfile.writeFileSync('./config.json', config);
    }
});
// get status of all servers
apiProxy.get('/api/status', (_req, res) => {
    res.json(serverStatuses);
});
// get log of server
apiProxy.get('/api/log/:server', (req, res) => {
    if (serverLogs[req.params.server] == undefined) {
        res.json([]);
        return;
    }
    // remove "undefined" from the start of the log
    serverLogs[req.params.server] = serverLogs[req.params.server].replace('undefined', '');

    // convert to json for every line
    let log = [];
    serverLogs[req.params.server].split('\n').forEach((line) => {
        log.push(line);
    });
    res.json(log);
});
// listen on url /api/console/:server for incoming commands
apiProxy.get('/api/console/:server', (req, _res) => {
    const server = req.params.server;
    const command = req.query.command;
    if (serverProcess[server] == undefined) return;
    serverProcess[server].stdin.write(command + '\n');
});
// for devPath seleciton
apiProxy.get('/api/selectDevPath/:server', (req, _res) => {
    const server = req.params.server;
    const python = start('python', ['selectFile.py']);
    let dataFromPy = [];
    python.stdout.on('data', function(data) {
        dataFromPy.push(data.toString());
    });
    python.on('close', (code) => {
        if (code == 0) {
            let path = dataFromPy[0].replace('\r\n', '');
            config[server].fileDevPath = path;
            jsonfile.writeFileSync('./config.json', config);
            sendActiveDevInfo(server, path, config[server].hasFileDevEnabled);
        }
    });
});
// for devPath toggle
apiProxy.get('/api/toggleDev/:server', (req, _res) => {
    const server = req.params.server;
    const enabled = req.query.enabled;
    let _enabled;
    if (enabled == "true") {
        _enabled = true;
    } else {
        _enabled = false;
    }
    toggleDev(server, _enabled);
    config[server].hasFileDevEnabled = _enabled;
    jsonfile.writeFileSync('./config.json', config);
});
// for opening plugins folder
apiProxy.get('/api/openPlugins/:server', (req, _res) => {
    const server = req.params.server;
    if (server == undefined) return;
    start('python', ['openPlugins.py', `${__dirname}/server/${server}/plugins`]);
});
// for exiting the server
apiProxy.get('/api/exit', (_req, res) => {
    res.send('ok');
    process.exit();
});

// start server
app.use(express.static('public'));
app.use(apiProxy);
app.listen(3000, () => {
    console.log('Server running on port 3000');
});

// enable auto copy
for (const server in config) {
    if (config[server].hasFileDevEnabled) {
        toggleDev(server, true);
    }
}

function serverControl(server, action) {
    let ram = config[server].ram;
    if (action == 'start') {
        serverProcess[server] = start('java', ['-Xmx' + ram + 'M', '-Xms' + ram + 'M', '-jar', `./${config[server].filename}`], {
            cwd: `./server/${server}`
        });
        serverStatuses[server] = {
            status: 'Starting...',
            players: 0,
            maxPlayers: 1
        }
        updateServerStatus(server, 'Starting...');
        serverProcess[server].stdout.on('data', (data) => {
            serverLogs[server] += data.toString() + '\n';
            sendNewLogMessage(server, data.toString());
            if (data.toString().includes('Done (') || data.toString().includes('Listening on /')) {
                updateServerStatus(server, 'Online');
            } else if (data.toString().includes("HelloItsMeAdm") && !config[server].isBungeecord) {
                getServerStatus(server);
            } else if (data.toString().includes("connected") || data.toString().includes("disconnected") && config[server].isBungeecord && !data.toString().includes("InitialHandler")) {
                getServerStatus(server);
            }
        });
    } else if (action == 'stop') {
        if (config[server].isBungeecord) {
            kill(serverProcess[server].pid);
            updateServerStatus(server, 'Offline');
            updateServerPlayers(server, 0, 0);
        } else {
            serverProcess[server].stdin.write('stop\n');
            updateServerStatus(server, 'Stopping...');
            serverProcess[server].on('close', (code) => {
                if (code === 0) {
                    updateServerStatus(server, 'Offline');
                    updateServerPlayers(server, 0, 0);
                }
            });
        }
    } else if (action == 'restart') {
        updateServerStatus(server, 'Restarting...');
        if (config[server].isBungeecord) {
            kill(serverProcess[server].pid);
            serverProcess[server].on('close', (_code) => {
                serverControl(server, 'start', ram);
            });
        } else {
            serverProcess[server].stdin.write('stop\n');
            serverProcess[server].on('close', (code) => {
                if (code === 0) {
                    serverControl(server, 'start', ram);
                }
            });
        }
    } else if (action == 'forceStop') {
        kill(serverProcess[server].pid);
        updateServerStatus(server, 'Offline');
        updateServerPlayers(server, 0, 0);
    }
}

function updateServerStatus(server, status) {
    serverStatuses[server].status = status;
    wss.clients.forEach((client) => {
        client.send(JSON.stringify({
            server: server,
            action: "status",
            data: status
        }));
    });
}

async function getServerStatus(server) {
    if (config[server].isBungeecord) {
        const socket = net.createConnection({
            host: 'localhost',
            port: config[server].port
        }, () => {
            socket.write(Buffer.from([0xFE, 0x01]));
        });
        socket.on('data', (data) => {
            let dataSplit = data.toString().split('');
            dataSplit = dataSplit.filter((item) => {
                return item != '\x00';
            });
            let players = dataSplit[dataSplit.length - 2];
            let maxPlayers = dataSplit[dataSplit.length - 1];
            updateServerPlayers(server, parseInt(players), parseInt(maxPlayers));
        });
    } else {
        const rcon = await Rcon.connect({
            host: "localhost",
            port: config[server].rconport,
            password: config[server].rconpassword
        });
        await rcon.send('list').then((response) => {
            let players = response.split(' ')[2].split('/')[0];
            let maxPlayers = response.split(' ')[2].split('/')[1];
            updateServerPlayers(server, parseInt(players), parseInt(maxPlayers));
        });
        rcon.end();
    }
}

function updateServerPlayers(server, players, maxPlayers) {
    serverStatuses[server].players = players;
    serverStatuses[server].maxPlayers = maxPlayers;
    wss.clients.forEach((client) => {
        client.send(JSON.stringify({
            server: server,
            action: "players",
            data: {
                players: players,
                maxPlayers: maxPlayers
            }
        }));
    });
}

function sendNewLogMessage(server, message) {
    if (message == '>') return;
    wss.clients.forEach((client) => {
        client.send(JSON.stringify({
            server: server,
            action: "log",
            data: message
        }));
    });
}

function sendActiveDevInfo(server, path, enabled) {
    wss.clients.forEach((client) => {
        client.send(JSON.stringify({
            server: server,
            action: "devPath",
            data: {
                path: path,
                enabled: enabled
            }
        }));
    });
}

function toggleDev(server, enabled) {
    if (devProcess.includes(server)) return;
    devProcess.push(server);

    if (enabled) {
        fs.copyFile(config[server].fileDevPath, `./server/${server}/plugins/${getOnlyFile(config[server].fileDevPath)}`, (err) => {
            if (err) throw err;
        });
        setTimeout(() => {
            devProcess.splice(devProcess.indexOf(server), 1);
            toggleDev(server, config[server].hasFileDevEnabled);
            return;
        }, 2000);
    } else {
        devProcess.splice(devProcess.indexOf(server), 1);
    }
}

function getOnlyFile(path) {
    return path.split("/")[(path.split("/").length - 1)];
}