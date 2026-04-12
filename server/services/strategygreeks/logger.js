const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "strategygreeks-paper.log");

function ensureLogFile() {
    try {
        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true });
        }
        if (!fs.existsSync(LOG_FILE)) {
            fs.writeFileSync(LOG_FILE, "", "utf8");
        }
    }
    catch (_err) {
        // best effort
    }
}

function write(level, msg, meta = null) {
    ensureLogFile();
    const ts = new Date().toISOString();
    const payload = {
        ts,
        level,
        msg,
        meta: meta || undefined
    };
    const line = JSON.stringify(payload);
    if (level === "error") {
        console.error(`[SG-PAPER] ${line}`);
    }
    else {
        console.log(`[SG-PAPER] ${line}`);
    }
    try {
        fs.appendFileSync(LOG_FILE, line + "\n", "utf8");
    }
    catch (_err) {
        // best effort
    }
}

module.exports = {
    info: (msg, meta) => write("info", msg, meta),
    warn: (msg, meta) => write("warn", msg, meta),
    error: (msg, meta) => write("error", msg, meta)
};
