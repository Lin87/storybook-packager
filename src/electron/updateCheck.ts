import { net } from 'electron';
import type { UpdateCheckResult } from '../types/updates';

/**
 * The repository that hosts the published releases. This is deliberately a
 * constant rather than being read from package.json's `repository` field: the
 * git remote and the release host are not necessarily the same repo.
 */
const GITHUB_OWNER = 'Lin87';
const GITHUB_REPO = 'storybook-packager';

const LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

/** Where "Download Now" points when no specific release has been resolved yet. */
export const RELEASES_PAGE_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * GitHub allows 60 unauthenticated requests per hour per IP. The About modal
 * re-checks every time it opens, so successful results are reused for a while.
 */
const CACHE_TTL_MS = 10 * 60 * 1000;

interface GitHubRelease {
    tag_name?: string;
    name?: string;
    html_url?: string;
    draft?: boolean;
    prerelease?: boolean;
}

interface ParsedVersion {
    release: number[];
    prerelease: string[];
}

let cached: { at: number; result: UpdateCheckResult } | null = null;
let latestReleaseUrl: string | null = null;

/** The release page for the most recent successful check, or the releases index. */
export function getLatestReleaseUrl(): string {
    return latestReleaseUrl ?? RELEASES_PAGE_URL;
}

/** `v1.2.3-beta.1` -> `{ release: [1,2,3], prerelease: ['beta','1'] }`. */
function parseVersion(raw: string): ParsedVersion | null {
    const trimmed = raw.trim().replace(/^v/i, '');
    const match = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?/.exec(trimmed);
    if (!match) return null;

    return {
        release: [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)],
        prerelease: match[4] ? match[4].split('.') : [],
    };
}

function comparePrerelease(a: string[], b: string[]): number {
    // A version with no prerelease tag outranks the same version with one.
    if (a.length === 0 && b.length === 0) return 0;
    if (a.length === 0) return 1;
    if (b.length === 0) return -1;

    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const left = a[i];
        const right = b[i];

        // A shorter set of identifiers has lower precedence.
        if (left === undefined) return -1;
        if (right === undefined) return 1;
        if (left === right) continue;

        const leftNumeric = /^\d+$/.test(left);
        const rightNumeric = /^\d+$/.test(right);

        if (leftNumeric && rightNumeric) return Number(left) < Number(right) ? -1 : 1;
        if (leftNumeric) return -1; // numeric identifiers rank below alphanumeric ones
        if (rightNumeric) return 1;

        return left < right ? -1 : 1;
    }

    return 0;
}

/** Returns a negative number when `a` is older than `b`, 0 when equal. */
export function compareVersions(a: string, b: string): number {
    const left = parseVersion(a);
    const right = parseVersion(b);

    // An unparseable version (such as the 'unknown' fallback) is never "newer".
    if (!left || !right) return 0;

    for (let i = 0; i < 3; i++) {
        if (left.release[i] !== right.release[i]) {
            return left.release[i] < right.release[i] ? -1 : 1;
        }
    }

    return comparePrerelease(left.prerelease, right.prerelease);
}

async function fetchLatestRelease(currentVersion: string): Promise<GitHubRelease> {
    const response = await net.fetch(LATEST_RELEASE_API, {
        headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': `storybook-packager/${currentVersion}`,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
        // /releases/latest 404s both when the repo is unreachable and when it
        // simply has no published (non-draft, non-prerelease) release yet.
        if (response.status === 404) {
            throw new Error('No releases have been published yet.');
        }

        if (response.status === 403 || response.status === 429) {
            throw new Error('GitHub rate limit reached. Try again later.');
        }

        throw new Error(`GitHub responded with ${response.status}.`);
    }

    return (await response.json()) as GitHubRelease;
}

/**
 * Checks GitHub Releases for a version newer than `currentVersion`. Never
 * throws; every failure comes back as an `error` result.
 *
 * This is notify-only by design. The app ships unsigned on every platform, so
 * downloading and installing an update silently is not something we can do
 * safely; the user is pointed at the release page instead.
 */
export async function checkForUpdates(currentVersion: string): Promise<UpdateCheckResult> {
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
        return cached.result;
    }

    let result: UpdateCheckResult;

    try {
        const release = await fetchLatestRelease(currentVersion);
        const tag = release.tag_name ?? release.name ?? '';
        const latestVersion = tag.trim().replace(/^v/i, '');

        if (!parseVersion(latestVersion)) {
            return { status: 'error', error: `Could not read the latest release version ("${tag}").` };
        }

        latestReleaseUrl = release.html_url ?? RELEASES_PAGE_URL;

        result =
            compareVersions(currentVersion, latestVersion) < 0
                ? { status: 'update-available', version: latestVersion, url: latestReleaseUrl }
                : { status: 'up-to-date', version: currentVersion };
    } catch (err) {
        // Errors are not cached: a check right after the network comes back
        // should hit GitHub rather than replay the failure.
        return { status: 'error', error: err instanceof Error ? err.message : String(err) };
    }

    cached = { at: Date.now(), result };
    return result;
}
