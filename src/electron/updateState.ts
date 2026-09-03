import fs from "fs";
import path from "path";
import { app } from "electron";

/** How long the launch-time check waits before hitting GitHub again. */
const AUTO_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** How long "Remind Me Later" hides a given version for. */
export const SNOOZE_DAYS = 7;

export interface UpdateState {
    lastCheckedAt?: string;
    snoozedVersion?: string;
    snoozedUntil?: string;
}

function getStatePath() {
    return path.join(app.getPath("userData"), "update-state.json");
}

export function loadUpdateState(): UpdateState {
    try {
        const statePath = getStatePath();
        if (fs.existsSync(statePath)) {
            const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
            return {
                lastCheckedAt: typeof state?.lastCheckedAt === "string" ? state.lastCheckedAt : undefined,
                snoozedVersion: typeof state?.snoozedVersion === "string" ? state.snoozedVersion : undefined,
                snoozedUntil: typeof state?.snoozedUntil === "string" ? state.snoozedUntil : undefined,
            };
        }
    } catch {}
    return {};
}

function saveUpdateState(state: UpdateState) {
    try {
        fs.writeFileSync(getStatePath(), JSON.stringify(state));
    } catch (e) {
        // Losing the record only means an extra check or an early reminder.
        console.warn("Failed to record update state:", e);
    }
}

/** Stamps the time of the most recent check, whatever its outcome. */
export function recordCheck() {
    saveUpdateState({ ...loadUpdateState(), lastCheckedAt: new Date().toISOString() });
}

/** True when the background check has not run in the last day. */
export function shouldAutoCheck(): boolean {
    const { lastCheckedAt } = loadUpdateState();
    if (!lastCheckedAt) return true;

    const last = Date.parse(lastCheckedAt);
    if (Number.isNaN(last)) return true;

    return Date.now() - last >= AUTO_CHECK_INTERVAL_MS;
}

export function snoozeVersion(version: string, days: number = SNOOZE_DAYS) {
    saveUpdateState({
        ...loadUpdateState(),
        snoozedVersion: version,
        snoozedUntil: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
    });
}

/** True while the user has asked to be reminded later about this exact version. */
export function isSnoozed(version: string): boolean {
    const { snoozedVersion, snoozedUntil } = loadUpdateState();
    if (snoozedVersion !== version || !snoozedUntil) return false;

    const until = Date.parse(snoozedUntil);
    if (Number.isNaN(until)) return false;

    return Date.now() < until;
}
