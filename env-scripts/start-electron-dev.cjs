/* eslint-disable @typescript-eslint/no-require-imports */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const distElectronDir = path.resolve(__dirname, "../dist-electron");
const preloadSrc = path.resolve(__dirname, "../src/electron/preload.cjs");
const preloadDest = path.resolve(__dirname, "../dist-electron/electron/preload.cjs")

if (fs.existsSync(distElectronDir)) {
    fs.rmSync(distElectronDir, { recursive: true, force: true });
}

const electronEntry = path.resolve(__dirname, "../dist-electron/electron/main.js");

function run(label, command) {
    console.log(`\n🚀 ${label}`);
    execSync(command, { stdio: "inherit" });
}

try {
    run("Building Electron...", "npx tsc -p tsconfig.electron.json");
    console.log("\n📄 Copying preload script...");
    fs.copyFileSync(preloadSrc, preloadDest);
    run("Launching Electron (dev)...", `cross-env ELECTRON_START_URL=http://localhost:3000 electron "${electronEntry}"`);
} catch (err) {
    console.error("\n❌ Dev launch failed:", err.message);
    process.exit(1);
}
