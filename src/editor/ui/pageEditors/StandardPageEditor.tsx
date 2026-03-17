'use client';

import { useEffect, useMemo, useRef, useState, type Ref } from 'react';
import { showToast } from '@/app/utils/toast';
import {
    createEmptyFrame,
    createEmptyMarker,
    createEmptySegment,
    getPageCapabilities,
    getPageType,
    PAGE_TYPE_LABELS,
    PAGE_TYPES,
    type SupportedPageType,
} from '@/editor/pageModel';
import type { Page, XmlAttributes } from '@/types/sbplus';
import type { PageEditorProps } from './types';
import RichTextEditor from './RichTextEditor';
import { usePageEditorState } from './usePageEditorState';

function isChecked(value: string | undefined) {
    return value === 'true' || value === 'yes' || value === 'on';
}

function updateAttrs(attrs: XmlAttributes | undefined, field: string, value: string | undefined) {
    const nextAttrs = { ...(attrs ?? {}) };
    if (value === undefined) {
        delete nextAttrs[field];
    } else {
        nextAttrs[field] = value;
    }
    return nextAttrs;
}

function Field({
    label,
    value,
    onChange,
    placeholder = '',
    onBlur,
    inputRef,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onBlur?: () => void;
    inputRef?: Ref<HTMLInputElement>;
}) {
    return (
        <label className='floating-label'>
            <span>{label}</span>
            <input
                className='input input-md w-full'
                value={value}
                placeholder={placeholder || label}
                onChange={(event) => onChange(event.target.value)}
                onBlur={onBlur}
                ref={inputRef}
            />
        </label>
    );
}

function TextBlock({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
    return (
        <label className='floating-label'>
            <span>{label}</span>
            <textarea className='textarea w-full' rows={rows} value={value} placeholder={label} onChange={(event) => onChange(event.target.value)} />
        </label>
    );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <label className='label cursor-pointer justify-start gap-3 rounded-box border border-base-300 bg-base-100 px-4 py-3'>
            <input type='checkbox' className='checkbox checkbox-sm' checked={checked} onChange={(event) => onChange(event.target.checked)} />
            <span className='label-text'>{label}</span>
        </label>
    );
}

function ArraySection({ title, children, addLabel, onAdd }: { title: string; children: React.ReactNode; addLabel: string; onAdd: () => void }) {
    return (
        <section className='space-y-3 rounded-box border border-base-300 bg-base-200 p-4'>
            <div className='flex items-center justify-between gap-3'>
                <h3 className='text-base font-semibold'>{title}</h3>
                <button type='button' className='btn btn-sm btn-outline' onClick={onAdd}>
                    {addLabel}
                </button>
            </div>
            <div className='space-y-3'>{children}</div>
        </section>
    );
}

function AccordionSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
    return (
        <div className='collapse collapse-arrow rounded-box border border-base-300 bg-base-200'>
            <input type='checkbox' defaultChecked={defaultOpen} />
            <div className='collapse-title text-base font-semibold'>{title}</div>
            <div className='collapse-content'>{children}</div>
        </div>
    );
}

function toFileUrl(path: string) {
    const normalized = path.replace(/\\/g, '/');
    const fileUrl = normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`;
    return encodeURI(fileUrl);
}

function withExtension(source: string, extension: string) {
    return /\.[a-z0-9]+$/i.test(source) ? source : `${source}.${extension}`;
}

function hasRemoteProtocol(source: string) {
    return /^(https?:)?\/\//i.test(source);
}

function parseTimecode(value: string | undefined) {
    if (!value) return Number.MAX_SAFE_INTEGER;
    const parts = value.split(':').map((part) => Number.parseInt(part, 10));
    if (parts.some((part) => Number.isNaN(part))) return Number.MAX_SAFE_INTEGER;
    return parts.reduce((total, part) => total * 60 + part, 0);
}

function getFrameTimeError(frames: NonNullable<Page['frame']>, index: number, value: string) {
    if (!value.trim()) return '';

    const currentTime = parseTimecode(value);
    if (currentTime === Number.MAX_SAFE_INTEGER) {
        return 'Enter time as mm:ss or hh:mm:ss.';
    }

    if (index > 0) {
        const previousValue = frames[index - 1]?.$?.start;
        if (previousValue) {
            const previousTime = parseTimecode(previousValue);
            if (currentTime < previousTime) {
                return `Start time cannot be before Frame ${index + 1}.`;
            }
        }
    }

    if (index < frames.length - 1) {
        const nextValue = frames[index + 1]?.$?.start;
        if (nextValue) {
            const nextTime = parseTimecode(nextValue);
            if (currentTime > nextTime) {
                return `Start time cannot be after Frame ${index + 3}.`;
            }
        }
    }

    return '';
}

function buildPreviewUrl(page: Page, pageType: SupportedPageType, presentationPath: string, imageFormat: string) {
    const source = page.$?.src?.trim();
    if (!source || !presentationPath) return null;

    if (pageType === 'image' || pageType === 'image-audio') {
        return null;
    }

    if (pageType === 'video') {
        return hasRemoteProtocol(source)
            ? source
            : toFileUrl(`${presentationPath}\\assets\\video\\${withExtension(source, 'mp4')}`);
    }

    if (pageType === 'youtube') {
        return `https://www.youtube.com/embed/${source}`;
    }

    if (pageType === 'html') {
        return hasRemoteProtocol(source)
            ? source
            : toFileUrl(`${presentationPath}\\assets\\html\\${withExtension(source, 'html')}`);
    }

    return null;
}

function buildImagePreviewAssetPath(page: Page, presentationPath: string, imageFormat: string) {
    const source = page.$?.src?.trim();
    if (!source || !presentationPath) return null;
    const imageBaseName = getPageType(page) === 'bundle' ? `${source}-1` : source;
    const imageName = withExtension(imageBaseName, imageFormat || 'jpg');
    return `${presentationPath}\\assets\\pages\\${imageName}`;
}

function buildFramePreviewAssetPath(source: string | undefined, presentationPath: string, imageFormat: string, frameNumber: number) {
    if (!source || !presentationPath) return null;
    const imageName = withExtension(`${source}-${frameNumber}`, imageFormat || 'jpg');
    return `${presentationPath}\\assets\\pages\\${imageName}`;
}

function buildAudioPreviewAssetPath(page: Page, pageType: SupportedPageType, presentationPath: string) {
    const source = page.$?.src?.trim();
    if (!source || !presentationPath || (pageType !== 'image-audio' && pageType !== 'bundle')) {
        return null;
    }

    const audioName = pageType === 'bundle' ? `${source}-bundled.mp3` : `${source}.mp3`;
    return `${presentationPath}\\assets\\audio\\${audioName}`;
}

function SourcePreview({ page, pageType, presentationPath, imageFormat, refreshKey }: { page: Page; pageType: SupportedPageType; presentationPath: string; imageFormat: string; refreshKey: number }) {
    const previewUrl = buildPreviewUrl(page, pageType, presentationPath, imageFormat);
    const imageAssetPath = buildImagePreviewAssetPath(page, presentationPath, imageFormat);
    const audioAssetPath = buildAudioPreviewAssetPath(page, pageType, presentationPath);
    const source = page.$?.src?.trim();
    const [imageFailed, setImageFailed] = useState(false);
    const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
    const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
    const previewSrc = previewUrl ? `${previewUrl}${previewUrl.includes('?') ? '&' : '?'}v=${refreshKey}` : imageDataUrl;
    const audioPreviewSrc = audioDataUrl;

    useEffect(() => {
        setImageFailed(false);
    }, [previewUrl, refreshKey, imageAssetPath]);

    useEffect(() => {
        let cancelled = false;

        if (pageType === 'image' || pageType === 'image-audio' || pageType === 'bundle') {
            if (!imageAssetPath) {
                setImageDataUrl(null);
                return;
            }

            window.electronAPI.getPresentationAssetDataUrl({ filePath: imageAssetPath }).then((result) => {
                if (cancelled) return;
                if (result.success) {
                    setImageDataUrl(result.dataUrl);
                    setImageFailed(false);
                } else {
                    setImageDataUrl(null);
                    setImageFailed(true);
                }
            });
        }

        return () => {
            cancelled = true;
        };
    }, [imageAssetPath, pageType, refreshKey]);

    useEffect(() => {
        let cancelled = false;

        if (pageType === 'image-audio' || pageType === 'bundle') {
            if (!audioAssetPath) {
                setAudioDataUrl(null);
                return;
            }

            window.electronAPI.getPresentationAssetDataUrl({ filePath: audioAssetPath }).then((result) => {
                if (cancelled) return;
                if (result.success) {
                    setAudioDataUrl(result.dataUrl);
                } else {
                    setAudioDataUrl(null);
                }
            });
        } else {
            setAudioDataUrl(null);
        }

        return () => {
            cancelled = true;
        };
    }, [audioAssetPath, pageType, refreshKey]);

    if (!source) {
        return (
            <section className='rounded-box border border-base-300 bg-base-200 p-4'>
                <h3 className='mb-2 text-base font-semibold'>Source Preview</h3>
                <p className='text-sm opacity-70'>Add a source to preview this page.</p>
            </section>
        );
    }

    if (pageType === 'image' || pageType === 'image-audio' || pageType === 'bundle') {
        return (
            <section className='space-y-3 rounded-box border border-base-300 bg-base-200 p-4'>
                <h3 className='text-base font-semibold'>Source Preview</h3>
                {previewSrc && !imageFailed ? (
                    <img
                        key={previewSrc}
                        src={previewSrc}
                        alt={page.$?.title ?? source}
                        className='max-h-80 w-full rounded-box border border-base-300 object-contain bg-base-100'
                        onError={() => setImageFailed(true)}
                        onLoad={() => setImageFailed(false)}
                    />
                ) : (
                    <div className='flex h-56 items-center justify-center rounded-box border border-dashed border-base-300 bg-base-100 text-sm opacity-70'>
                        Image preview unavailable. Upload a matching page image to `assets/pages`.
                    </div>
                )}
                {(pageType === 'image-audio' || pageType === 'bundle') && audioPreviewSrc && (
                    <div className='space-y-2'>
                        <div className='text-sm font-medium'>Audio Preview</div>
                        <audio controls className='w-full' src={audioPreviewSrc} />
                    </div>
                )}
                <div className='text-xs opacity-70'>{source}</div>
            </section>
        );
    }

    if (pageType === 'video') {
        return (
            <section className='space-y-3 rounded-box border border-base-300 bg-base-200 p-4'>
                <h3 className='text-base font-semibold'>Source Preview</h3>
                {previewUrl ? (
                    <video controls className='max-h-80 w-full rounded-box border border-base-300 bg-black' src={previewUrl} />
                ) : (
                    <p className='text-sm opacity-70'>Preview unavailable for this source.</p>
                )}
                <div className='text-xs opacity-70'>{source}</div>
            </section>
        );
    }

    if (pageType === 'youtube' || pageType === 'html') {
        return (
            <section className='space-y-3 rounded-box border border-base-300 bg-base-200 p-4'>
                <h3 className='text-base font-semibold'>Source Preview</h3>
                {previewUrl ? (
                    <iframe
                        title={`${pageType}-preview`}
                        src={previewUrl}
                        className='h-80 w-full rounded-box border border-base-300 bg-base-100'
                        allow='autoplay; encrypted-media; picture-in-picture'
                    />
                ) : (
                    <p className='text-sm opacity-70'>Preview unavailable for this source.</p>
                )}
                <div className='text-xs opacity-70'>{source}</div>
            </section>
        );
    }

    return (
        <section className='space-y-2 rounded-box border border-base-300 bg-base-200 p-4'>
            <h3 className='text-base font-semibold'>Source Preview</h3>
            <p className='text-sm opacity-70'>Live preview is not available for this provider yet.</p>
            <div className='rounded-box border border-base-300 bg-base-100 px-3 py-2 font-mono text-xs'>{source}</div>
        </section>
    );
}

function FrameThumbnail({
    assetPath,
    alt,
    refreshKey,
}: {
    assetPath: string | null;
    alt: string;
    refreshKey: number;
}) {
    const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        if (!assetPath) {
            setImageDataUrl(null);
            return;
        }

        window.electronAPI.getPresentationAssetDataUrl({ filePath: assetPath }).then((result) => {
            if (cancelled) return;
            setImageDataUrl(result.success ? result.dataUrl : null);
        });

        return () => {
            cancelled = true;
        };
    }, [assetPath, refreshKey]);

    if (!imageDataUrl) {
        return (
            <div className='flex h-18 w-24 items-center justify-center rounded-box border border-dashed border-base-300 bg-base-100 text-[11px] opacity-70'>
                No image
            </div>
        );
    }

    return <img src={imageDataUrl} alt={alt} className='h-18 w-24 rounded-box border border-base-300 object-cover bg-base-100' />;
}

export default function StandardPageEditor({ sectionIndex, pageIndex }: PageEditorProps) {
    const { dispatch, page, state } = usePageEditorState(sectionIndex, pageIndex);

    const pageType = useMemo(() => (page ? getPageType(page) : 'image'), [page]);
    const caps = useMemo(() => getPageCapabilities(pageType), [pageType]);
    const pageImageFormat = state.xml?.storybook.$?.pageImgFormat ?? 'jpg';
    const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
    const [pendingFrameFocusIndex, setPendingFrameFocusIndex] = useState<number | null>(null);
    const frameInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
    const [frameStartDrafts, setFrameStartDrafts] = useState<Record<number, string>>({});
    const [frameStartErrors, setFrameStartErrors] = useState<Record<number, string>>({});

    if (!page) return <div className='text-sm opacity-70'>Page not found.</div>;

    useEffect(() => {
        if (pendingFrameFocusIndex === null) return;

        const input = frameInputRefs.current[pendingFrameFocusIndex];
        if (input) {
            input.focus();
            input.select();
            setPendingFrameFocusIndex(null);
        }
    }, [page?.frame, pendingFrameFocusIndex]);

    useEffect(() => {
        setFrameStartDrafts({});
        setFrameStartErrors({});
    }, [sectionIndex, pageIndex]);

    const replacePage = (nextPage: Page) => {
        dispatch({
            type: 'replacePage',
            payload: { sectionIndex, pageIndex, page: nextPage },
        });
    };

    const updateAttr = (field: string, value: string | undefined) => {
        dispatch({
            type: 'updatePageAttr',
            payload: { sectionIndex, pageIndex, field, value },
        });
    };

    const updateField = (field: 'note' | 'description' | 'copyableContent', value: string | undefined) => {
        dispatch({
            type: 'updatePageField',
            payload: { sectionIndex, pageIndex, field, value },
        });
    };

    const commitFrameStartTime = (index: number) => {
        const draftValue = frameStartDrafts[index];
        if (draftValue === undefined) return;

        const frames = [...(page.frame ?? [])];
        const error = getFrameTimeError(frames, index, draftValue);

        if (error) {
            setFrameStartErrors((current) => ({ ...current, [index]: error }));
            return;
        }

        frames[index] = {
            ...frames[index],
            $: updateAttrs(frames[index]?.$, 'start', draftValue),
        };

        replacePage({ ...page, frame: frames });
        setFrameStartDrafts((current) => {
            const next = { ...current };
            delete next[index];
            return next;
        });
        setFrameStartErrors((current) => {
            const next = { ...current };
            delete next[index];
            return next;
        });
    };

    const handleImportAsset = async (kind: 'page-image' | 'page-audio' | 'bundle-audio' | 'video') => {
        const sourceName = page.$?.src?.trim();
        if (!sourceName) {
            showToast('Set the Source field before importing an asset.', 'warning');
            return;
        }

        const result = await window.electronAPI.importPresentationAsset({
            presentationPath: state.presentationPath,
            kind,
            sourceName,
            imageFormat: pageImageFormat,
        });

        if (result.success) {
            setPreviewRefreshKey((value) => value + 1);
            showToast('Asset imported.', 'success');
            return;
        }

        if (result.error !== 'Import canceled.') {
            showToast(result.error, 'error');
        }
    };

    const handleImportFrameImage = async (frameNumber: number) => {
        const sourceName = page.$?.src?.trim();
        if (!sourceName) {
            showToast('Set the Source field before importing a frame image.', 'warning');
            return;
        }

        const result = await window.electronAPI.importPresentationAsset({
            presentationPath: state.presentationPath,
            kind: 'page-image',
            sourceName,
            imageFormat: pageImageFormat,
            targetBaseName: `${sourceName}-${frameNumber}`,
        });

        if (result.success) {
            setPreviewRefreshKey((value) => value + 1);
            showToast(`Frame ${frameNumber} image imported.`, 'success');
            return;
        }

        if (result.error !== 'Import canceled.') {
            showToast(result.error, 'error');
        }
    };

    return (
        <div className='space-y-6'>
            <section className='space-y-4 rounded-box border border-base-300 bg-base-200 p-4'>
                <div className='grid gap-4 md:grid-cols-2'>
                    <label className='form-control gap-2'>
                        <span className='label-text'>Page Type</span>
                        <select
                            className='select select-bordered'
                            value={pageType}
                            onChange={(event) =>
                                dispatch({
                                    type: 'changePageType',
                                    payload: {
                                        sectionIndex,
                                        pageIndex,
                                        pageType: event.target.value as SupportedPageType,
                                    },
                                })
                            }>
                            {PAGE_TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {PAGE_TYPE_LABELS[type]}
                                </option>
                            ))}
                        </select>
                    </label>

                    <Field
                        label='Title'
                        value={page.$?.title ?? ''}
                        onChange={(value) => updateAttr('title', value)}
                    />
                </div>

                <div className='grid gap-4 md:grid-cols-2'>
                    {caps.supportsSrc && (
                        <div className='space-y-2'>
                            <Field
                                label='Source'
                                value={page.$?.src ?? ''}
                                onChange={(value) => updateAttr('src', value || undefined)}
                                placeholder='Asset name or external ID'
                            />
                            <div className='flex flex-wrap gap-2'>
                                {(pageType === 'image' || pageType === 'image-audio' || pageType === 'bundle') && (
                                    <button
                                        type='button'
                                        className='btn btn-sm btn-outline'
                                        onClick={() => handleImportAsset('page-image')}>
                                        {pageType === 'bundle' ? 'Upload Main Frame Image' : 'Upload Page Image'}
                                    </button>
                                )}
                                {pageType === 'image-audio' && (
                                    <button type='button' className='btn btn-sm btn-outline' onClick={() => handleImportAsset('page-audio')}>
                                        Upload Audio
                                    </button>
                                )}
                                {pageType === 'bundle' && (
                                    <button type='button' className='btn btn-sm btn-outline' onClick={() => handleImportAsset('bundle-audio')}>
                                        Upload Audio
                                    </button>
                                )}
                                {pageType === 'video' && (
                                    <button type='button' className='btn btn-sm btn-outline' onClick={() => handleImportAsset('video')}>
                                        Upload Video
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {caps.supportsTransition && (
                        <Field
                            label='Transition'
                            value={page.$?.transition ?? ''}
                            onChange={(value) => updateAttr('transition', value || undefined)}
                        />
                    )}
                </div>

                <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                    {caps.supportsPreventAutoplay && (
                        <Toggle
                            label='Prevent autoplay'
                            checked={isChecked(page.$?.preventAutoplay)}
                            onChange={(checked) => updateAttr('preventAutoplay', checked ? 'true' : 'false')}
                        />
                    )}
                    {caps.supportsAllowFullscreen && (
                        <Toggle
                            label='Allow fullscreen'
                            checked={isChecked(page.$?.allowFullscreen)}
                            onChange={(checked) => updateAttr('allowFullscreen', checked ? 'true' : 'false')}
                        />
                    )}
                    {caps.supportsUseDefaultPlayer && (
                        <Toggle
                            label='Use default player'
                            checked={isChecked(page.$?.useDefaultPlayer)}
                            onChange={(checked) => updateAttr('useDefaultPlayer', checked ? 'true' : 'false')}
                        />
                    )}
                    {caps.supportsEmbed && (
                        <Toggle
                            label='Embed content'
                            checked={isChecked(page.$?.embed)}
                            onChange={(checked) => updateAttr('embed', checked ? 'yes' : 'false')}
                        />
                    )}
                    {caps.supportsFullHeight && (
                        <Toggle
                            label='Full height'
                            checked={isChecked(page.$?.fullHeight)}
                            onChange={(checked) => updateAttr('fullHeight', checked ? 'true' : 'false')}
                        />
                    )}
                </div>
            </section>

            {!caps.supportsFrames && (
                <SourcePreview
                    page={page}
                    pageType={pageType}
                    presentationPath={state.presentationPath}
                    imageFormat={pageImageFormat}
                    refreshKey={previewRefreshKey}
                />
            )}

            {caps.supportsFrames && (
                <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]'>
                    <SourcePreview
                        page={page}
                        pageType={pageType}
                        presentationPath={state.presentationPath}
                        imageFormat={pageImageFormat}
                        refreshKey={previewRefreshKey}
                    />
                    <ArraySection
                        title='Frames'
                        addLabel='Add Frame'
                        onAdd={() => {
                            const nextFrames = [...(page.frame ?? []), createEmptyFrame()];
                            setPendingFrameFocusIndex(nextFrames.length - 1);
                            replacePage({
                                ...page,
                                frame: nextFrames,
                            });
                        }}>
                        <div className='rounded-box border border-base-300 bg-base-100 px-3 py-2 text-sm opacity-80'>
                            The main source preview uses <span className='font-mono'>{`${page.$?.src ?? 'source'}-1.${pageImageFormat}`}</span>. Frame entries below start at <span className='font-mono'>{`${page.$?.src ?? 'source'}-2.${pageImageFormat}`}</span> and stay sorted by start time.
                        </div>
                        {(page.frame ?? []).map((frame, index) => {
                            const frameNumber = index + 2;
                            const frameAssetPath = buildFramePreviewAssetPath(page.$?.src, state.presentationPath, pageImageFormat, frameNumber);

                            return (
                                <div key={`frame-${index}`} className='space-y-3 rounded-box border border-base-300 bg-base-100 p-3'>
                                    <div className='flex flex-wrap items-center justify-between gap-3'>
                                        <div className='font-medium'>Frame {frameNumber}</div>
                                        <div className='text-xs opacity-70'>
                                            Image: <span className='font-mono'>{`${page.$?.src ?? 'source'}-${frameNumber}.${pageImageFormat}`}</span>
                                        </div>
                                    </div>
                                    <div className='flex flex-wrap items-end gap-3'>
                                        <FrameThumbnail
                                            assetPath={frameAssetPath}
                                            alt={`Frame ${frameNumber}`}
                                            refreshKey={previewRefreshKey}
                                        />
                                        <div className='min-w-56 flex-1'>
                                            <Field
                                                label='Start Time'
                                                value={frameStartDrafts[index] ?? frame.$?.start ?? ''}
                                                onChange={(value) => {
                                                    setFrameStartDrafts((current) => ({ ...current, [index]: value }));
                                                    setFrameStartErrors((current) => ({
                                                        ...current,
                                                        [index]: getFrameTimeError([...(page.frame ?? [])], index, value),
                                                    }));
                                                }}
                                                onBlur={() => commitFrameStartTime(index)}
                                                inputRef={(element) => {
                                                    frameInputRefs.current[index] = element;
                                                }}
                                            />
                                            {frameStartErrors[index] && <div className='mt-1 text-xs text-error'>{frameStartErrors[index]}</div>}
                                        </div>
                                        <button
                                            type='button'
                                            className='btn btn-sm btn-outline'
                                            onClick={() => handleImportFrameImage(frameNumber)}>
                                            Import Image
                                        </button>
                                        <button
                                            type='button'
                                            className='btn btn-sm btn-error btn-outline'
                                            onClick={() =>
                                                replacePage({
                                                    ...page,
                                                    frame: (page.frame ?? []).filter((_, currentIndex) => currentIndex !== index),
                                                })
                                            }>
                                            Remove Frame
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </ArraySection>
                </div>
            )}

            {caps.supportsNote && (
                <RichTextEditor
                    label='Note'
                    value={page.note ?? ''}
                    onChange={(value) => updateField('note', value || undefined)}
                />
            )}

            {caps.supportsDescription && (
                <AccordionSection title='Description'>
                    <RichTextEditor
                        label='Description'
                        value={page.description ?? ''}
                        onChange={(value) => updateField('description', value || undefined)}
                    />
                </AccordionSection>
            )}

            {caps.supportsCopyableContent && (
                <AccordionSection title='Copyable Content'>
                    <TextBlock
                        label='Copyable Content'
                        rows={4}
                        value={page.copyableContent ?? ''}
                        onChange={(value) => updateField('copyableContent', value || undefined)}
                    />
                </AccordionSection>
            )}

            {caps.supportsMarkers && (
                <AccordionSection title='Markers'>
                    <ArraySection
                        title='Markers'
                        addLabel='Add Marker'
                        onAdd={() =>
                            replacePage({
                                ...page,
                                markers: {
                                    marker: [...(page.markers?.marker ?? []), createEmptyMarker()],
                                },
                            })
                        }>
                        {(page.markers?.marker ?? []).map((marker, index) => (
                            <div key={index} className='space-y-3 rounded-box border border-base-300 bg-base-100 p-3'>
                                <div className='grid gap-3 md:grid-cols-2'>
                                    <Field
                                        label='Timecode'
                                        value={marker.$?.timecode ?? ''}
                                        onChange={(value) => {
                                            const markers = [...(page.markers?.marker ?? [])];
                                            markers[index] = { ...marker, $: updateAttrs(marker.$, 'timecode', value) };
                                            replacePage({ ...page, markers: { marker: markers } });
                                        }}
                                    />
                                    <Field
                                        label='Color'
                                        value={marker.$?.color ?? ''}
                                        onChange={(value) => {
                                            const markers = [...(page.markers?.marker ?? [])];
                                            markers[index] = { ...marker, $: updateAttrs(marker.$, 'color', value) };
                                            replacePage({ ...page, markers: { marker: markers } });
                                        }}
                                    />
                                </div>
                                <TextBlock
                                    label='Label'
                                    value={marker._ ?? ''}
                                    rows={2}
                                    onChange={(value) => {
                                        const markers = [...(page.markers?.marker ?? [])];
                                        markers[index] = { ...marker, _: value };
                                        replacePage({ ...page, markers: { marker: markers } });
                                    }}
                                />
                                <button
                                    type='button'
                                    className='btn btn-sm btn-error btn-outline'
                                    onClick={() => replacePage({ ...page, markers: { marker: (page.markers?.marker ?? []).filter((_, currentIndex) => currentIndex !== index) } })}>
                                    Remove Marker
                                </button>
                            </div>
                        ))}
                    </ArraySection>
                </AccordionSection>
            )}

            {caps.supportsWidget && (
                <AccordionSection title='Widget Segments'>
                    <ArraySection
                        title='Widget Segments'
                        addLabel='Add Segment'
                        onAdd={() =>
                            replacePage({
                                ...page,
                                widget: {
                                    ...(page.widget ?? {}),
                                    segment: [...(page.widget?.segment ?? []), createEmptySegment()],
                                },
                            })
                        }>
                        {(page.widget?.segment ?? []).map((segment, index) => (
                            <div key={index} className='space-y-3 rounded-box border border-base-300 bg-base-100 p-3'>
                                <Field
                                    label='Segment Name'
                                    value={segment.$?.name ?? ''}
                                    onChange={(value) => {
                                        const segments = [...(page.widget?.segment ?? [])];
                                        segments[index] = { ...segment, $: updateAttrs(segment.$, 'name', value) };
                                        replacePage({ ...page, widget: { ...(page.widget ?? {}), segment: segments } });
                                    }}
                                />
                                <RichTextEditor
                                    label='Segment Content'
                                    value={segment._ ?? ''}
                                    onChange={(value) => {
                                        const segments = [...(page.widget?.segment ?? [])];
                                        segments[index] = { ...segment, _: value };
                                        replacePage({ ...page, widget: { ...(page.widget ?? {}), segment: segments } });
                                    }}
                                    minHeightClassName='min-h-24'
                                />
                                <button
                                    type='button'
                                    className='btn btn-sm btn-error btn-outline'
                                    onClick={() =>
                                        replacePage({
                                            ...page,
                                            widget: {
                                                ...(page.widget ?? {}),
                                                segment: (page.widget?.segment ?? []).filter((_, currentIndex) => currentIndex !== index),
                                            },
                                        })
                                    }>
                                    Remove Segment
                                </button>
                            </div>
                        ))}
                    </ArraySection>
                </AccordionSection>
            )}

            {caps.supportsAudio && (
                <section className='space-y-3 rounded-box border border-base-300 bg-base-200 p-4'>
                    <h3 className='text-base font-semibold'>Inline Audio Attributes</h3>
                    <div className='grid gap-3 md:grid-cols-2'>
                        {['src', 'autoplay', 'loop', 'controls'].map((field) => (
                            <Field
                                key={field}
                                label={field}
                                value={page.audio?.$?.[field] ?? ''}
                                onChange={(value) =>
                                    replacePage({
                                        ...page,
                                        audio: {
                                            $: updateAttrs(page.audio?.$, field, value || undefined),
                                        },
                                    })
                                }
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
