/* eslint-disable @typescript-eslint/no-require-imports */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const os = require("os");

const distElectronDir = path.resolve(__dirname, "../dist-electron");
const preloadSrc = path.resolve(__dirname, "../src/electron/preload.cjs");
const preloadDest = path.resolve(__dirname, "../dist-electron/electron/preload.cjs")

if (fs.existsSync(distElectronDir)) {
    fs.rmSync(distElectronDir, { recursive: true, force: true });
}

/**
 * Mirrors Electron's `app.getPath('userData')` for the app name set in main.ts.
 * Only used to reset dev-only state before launching.
 */
function getUserDataDir() {
    const appName = "Storybook Packager";

    if (process.platform === "win32") {
        return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), appName);
    }

    if (process.platform === "darwin") {
        return path.join(os.homedir(), "Library", "Application Support", appName);
    }

    return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), appName);
}

// Dev launches always start at the first-run agreement screen, so that flow stays
// easy to test. Packaged builds keep the acceptance record.
const acceptanceFile = path.join(getUserDataDir(), "legal-acceptance.json");

if (fs.existsSync(acceptanceFile)) {
    fs.rmSync(acceptanceFile, { force: true });
    console.log("\n🧹 Cleared legal acceptance (dev): first-run screen will be shown.");
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
