import fs from 'fs';
import os from 'os';
import path from 'path';
import { ZipArchive } from 'archiver';

export interface ExportPresentationPackageOptions {
    sourcePath: string;
    targetPath: string;
    xmlContent: string;
}

export function ensurePresentationFolders(basePath: string) {
    const assetsPath = path.join(basePath, 'assets');
    const subDirs = ['audio', 'video', 'images', 'html', 'pages'];

    fs.mkdirSync(assetsPath, { recursive: true });
    subDirs.forEach((dir) => fs.mkdirSync(path.join(assetsPath, dir), { recursive: true }));
}

export function exportPresentationPackageToDirectory({ sourcePath, targetPath, xmlContent }: ExportPresentationPackageOptions) {
    ensurePresentationFolders(targetPath);

    const sourceAssetsPath = path.join(sourcePath, 'assets');
    const targetAssetsPath = path.join(targetPath, 'assets');

    if (fs.existsSync(sourceAssetsPath)) {
        fs.cpSync(sourceAssetsPath, targetAssetsPath, {
            recursive: true,
            force: true,
            errorOnExist: false,
        });
    }

    fs.writeFileSync(path.join(targetAssetsPath, 'sbplus.xml'), xmlContent, 'utf-8');
}

function listFiles(directory: string): string[] {
    if (!fs.existsSync(directory)) return [];

    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            return listFiles(entryPath);
        }

        return entry.isFile() ? [entryPath] : [];
    });
}

export async function zipPresentationPackageDirectory(sourceDirectory: string, targetPath: string) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });

    await new Promise<void>((resolve, reject) => {
        const output = fs.createWriteStream(targetPath);
        const archive = new ZipArchive({ zlib: { level: 9 } });

        output.on('close', resolve);
        output.on('error', reject);
        archive.on('error', reject);

        archive.pipe(output);

        for (const filePath of listFiles(sourceDirectory)) {
            archive.file(filePath, {
                name: path.relative(sourceDirectory, filePath).split(path.sep).join('/'),
            });
        }

        archive.finalize().catch(reject);
    }).catch((error: unknown) => {
        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
        }

        throw error;
    });
}

export async function exportPresentationPackageToZip({ sourcePath, targetPath, xmlContent }: ExportPresentationPackageOptions) {
    const stagingPath = fs.mkdtempSync(path.join(os.tmpdir(), 'storybook-package-'));

    try {
        exportPresentationPackageToDirectory({
            sourcePath,
            targetPath: stagingPath,
            xmlContent,
        });
        await zipPresentationPackageDirectory(stagingPath, targetPath);
    } finally {
        fs.rmSync(stagingPath, { recursive: true, force: true });
    }
}
