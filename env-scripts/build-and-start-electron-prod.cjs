/* eslint-disable @typescript-eslint/no-require-imports */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const outDir = path.resolve(__dirname, "../out");

if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
}

const electronEntry = path.resolve(__dirname, "../dist-electron/electron/main.js");
const preloadSrc = path.resolve(__dirname, "../src/electron/preload.cjs");
const preloadDest = path.resolve(__dirname, "../dist-electron/electron/preload.cjs");

function run(label, command) {
    console.log(`\n🚀 ${label}`);
    execSync(command, { stdio: "inherit" });
}

try {
    run("Building Next.js...", "npm run build:next");
    // Skipping next export — handled via output: "export"
    run("Building Electron...", "npx tsc -p tsconfig.electron.json");
    console.log("\n📄 Copying preload script...");
    fs.copyFileSync(preloadSrc, preloadDest);
    run("Launching Electron (prod)...", `electron "${electronEntry}"`);
} catch (err) {
    console.error("\n❌ Production launch failed:", err.message);
    process.exit(1);
}
