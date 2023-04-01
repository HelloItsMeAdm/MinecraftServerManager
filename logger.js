const os = require('os');
const colors = {
    reset: "\x1b[0m",
    underline: "\x1b[4m",
    bright: "\x1b[1m",

    fg: {
        red: "\x1b[31m", // Error
        green: "\x1b[32m", // Info
        yellow: "\x1b[33m", // Warning
        magenta: "\x1b[35m", // Module
        cyan: "\x1b[36m", // Timestamp
        white: "\x1b[37m", // Message
        blue: "\x1b[34m" // Header
    }
};
class Logger {
    constructor() {
        this.logs = {};
        this.serverStats = {};
        this.serverList = [];
    }

    setServerList(servers) {
        this.serverList = servers;
        console.log(this.serverList);
    }

    log(module, type, message) {
        // Filter type
        if (type === "INFO") {
            type = colors.fg.green + `[${type}]` + colors.reset;
        } else if (type === "WARNING") {
            type = colors.fg.yellow + `[${type}]` + colors.reset;
        } else if (type === "ERROR") {
            type = colors.fg.red + `[${type}]` + colors.reset;
        }

        // Create record of log
        const log = {
            module: module,
            message: message,
            type: type,
            timestamp: this.timestamp
        };

        // Add log to total logs as new record
        this.logs[module] = this.logs[module] || [];
        this.logs[module].push(log);



        // Print log
        this.printLogs();
    }

    updateServerStats(server, status, players, maxPlayers, ram) {
        this.serverStats[server] = {
            status: status,
            players: players,
            maxPlayers: maxPlayers,
            ram: ram
        };
        this.printLogs();
    }

    clearConsole() {
        os.type() === 'Windows_NT' ? process.stdout.write('\x1Bc') : process.stdout.write('\x1B[2J\x1B[3J\x1B[H');
    }

    get timestamp() {
        const date = new Date();
        let hours = date.getHours();
        let minutes = date.getMinutes();
        let seconds = date.getSeconds();
        hours = hours < 10 ? '0' + hours : hours;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        seconds = seconds < 10 ? '0' + seconds : seconds;
        return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()} ${hours}:${minutes}:${seconds}`;
    }

    printLogs() {
        this.clearConsole();
        console.log(`${colors.fg.blue}================================================= ${colors.reset}${colors.fg.cyan}[${this.timestamp}]${colors.reset}${colors.fg.blue} ==============================================${colors.reset}\n${colors.fg.blue}#${colors.reset}`)
        console.log(`${colors.fg.blue}# ${colors.reset}${colors.fg.blue}=================================================== ${colors.reset}${colors.fg.cyan}${colors.underline}SERVER STATUS${colors.reset}${colors.fg.blue} =================================================${colors.reset}`);
        for (const server in this.serverStats) {
            console.log(`${colors.fg.blue}#${colors.reset}\n${colors.fg.blue}#${colors.reset} ${colors.fg.magenta}${colors.underline}${server}${colors.reset}`);
            console.log(`${colors.fg.blue}#${colors.reset}${colors.fg.cyan}   • Status: ${this.serverStats[server].status === "Online" ? colors.fg.green + this.serverStats[server].status.toUpperCase() + colors.reset : colors.fg.red + this.serverStats[server].status.toUpperCase() + colors.reset}${colors.reset}`);
            console.log(`${colors.fg.blue}#${colors.reset}${colors.fg.cyan}   • Players: ${colors.reset}${this.serverStats[server].players}/${this.serverStats[server].maxPlayers}${colors.reset}`);
            console.log(`${colors.fg.blue}#${colors.reset}${colors.fg.cyan}   • RAM: ${colors.reset}${this.serverStats[server].ram} MB${colors.reset}`);
        }
        console.log(`${colors.fg.blue}# ${colors.reset}\n${colors.fg.blue}# ${colors.reset}${colors.fg.blue}======================================================= ${colors.reset}${colors.fg.cyan}${colors.underline}LOGS${colors.reset}${colors.fg.blue} ======================================================${colors.reset}\n${colors.fg.blue}#${colors.reset}`);
        for (const log in this.logs) {
            for (const i in this.logs[log]) {
                let message = this.logs[log][i].message;
                this.serverList.forEach(server => {
                    if (message.includes(server)) {
                        message = message.replace(server, colors.bright + server + colors.reset);
                    }
                });
                console.log(`${colors.fg.blue}#${colors.reset}${colors.fg.cyan} [${this.logs[log][i].timestamp}]${colors.reset} ${colors.fg.magenta}[${this.logs[log][i].module}]${colors.reset} ${this.logs[log][i].type} ${colors.fg.white}${message}${colors.reset}`);
            }
        }
    }
}

module.exports = Logger;