import fs from "fs";
import path from "path";
import { app } from "electron";
import { LEGAL_DOC_VERSION } from "../lib/legal.js";
import type { LegalAcceptance } from "../lib/legal.js";

function getAcceptancePath() {
    return path.join(app.getPath("userData"), "legal-acceptance.json");
}

export function loadLegalAcceptance(): LegalAcceptance | null {
    try {
        const acceptancePath = getAcceptancePath();
        if (fs.existsSync(acceptancePath)) {
            const state = JSON.parse(fs.readFileSync(acceptancePath, "utf-8"));
            if (typeof state?.version === "string") {
                return {
                    version: state.version,
                    acceptedAt: typeof state.acceptedAt === "string" ? state.acceptedAt : "",
                    appVersion: typeof state.appVersion === "string" ? state.appVersion : "",
                };
            }
        }
    } catch {}
    return null;
}

export function saveLegalAcceptance(appVersion: string) {
    try {
        const acceptance: LegalAcceptance = {
            version: LEGAL_DOC_VERSION,
            acceptedAt: new Date().toISOString(),
            appVersion,
        };
        fs.writeFileSync(getAcceptancePath(), JSON.stringify(acceptance));
    } catch (e) {
        // Losing the record only means the screen is shown again next launch.
        console.warn("Failed to record legal acceptance:", e);
    }
}

/** True only when the currently published documents are the ones that were accepted. */
export function hasAcceptedCurrentLegal(): boolean {
    return loadLegalAcceptance()?.version === LEGAL_DOC_VERSION;
}
