import fs from 'fs';
import path from 'path';

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
