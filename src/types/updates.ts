export type UpdateCheckResult =
    | { status: "unsupported" }
    | { status: "up-to-date"; version: string }
    | { status: "update-available"; version: string; url?: string }
    | { status: "error"; error: string };
