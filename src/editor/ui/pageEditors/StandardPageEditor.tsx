'use client';

import { useMemo } from 'react';
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

function Field({ label, value, onChange, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
    return (
        <label className='floating-label'>
            <span>{label}</span>
            <input className='input input-md w-full' value={value} placeholder={placeholder || label} onChange={(event) => onChange(event.target.value)} />
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

export default function StandardPageEditor({ sectionIndex, pageIndex }: PageEditorProps) {
    const { dispatch, page } = usePageEditorState(sectionIndex, pageIndex);

    const pageType = useMemo(() => (page ? getPageType(page) : 'image'), [page]);
    const caps = useMemo(() => getPageCapabilities(pageType), [pageType]);

    if (!page) return <div className='text-sm opacity-70'>Page not found.</div>;

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
                        <Field
                            label='Source'
                            value={page.$?.src ?? ''}
                            onChange={(value) => updateAttr('src', value || undefined)}
                            placeholder='Asset name or external ID'
                        />
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

            {caps.supportsNote && (
                <RichTextEditor
                    label='Note'
                    value={page.note ?? ''}
                    onChange={(value) => updateField('note', value || undefined)}
                />
            )}

            {caps.supportsDescription && (
                <RichTextEditor
                    label='Description'
                    value={page.description ?? ''}
                    onChange={(value) => updateField('description', value || undefined)}
                />
            )}

            {caps.supportsCopyableContent && (
                <TextBlock
                    label='Copyable Content'
                    rows={4}
                    value={page.copyableContent ?? ''}
                    onChange={(value) => updateField('copyableContent', value || undefined)}
                />
            )}

            {caps.supportsMarkers && (
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
            )}

            {caps.supportsWidget && (
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
            )}

            {caps.supportsFrames && (
                <ArraySection
                    title='Frames'
                    addLabel='Add Frame'
                    onAdd={() => replacePage({ ...page, frame: [...(page.frame ?? []), createEmptyFrame()] })}>
                    {(page.frame ?? []).map((frame, index) => (
                        <div key={index} className='flex flex-wrap items-end gap-3 rounded-box border border-base-300 bg-base-100 p-3'>
                            <div className='flex-1 min-w-56'>
                                <Field
                                    label='Start Time'
                                    value={frame.$?.start ?? ''}
                                    onChange={(value) => {
                                        const frames = [...(page.frame ?? [])];
                                        frames[index] = { ...frame, $: updateAttrs(frame.$, 'start', value) };
                                        replacePage({ ...page, frame: frames });
                                    }}
                                />
                            </div>
                            <button
                                type='button'
                                className='btn btn-sm btn-error btn-outline'
                                onClick={() => replacePage({ ...page, frame: (page.frame ?? []).filter((_, currentIndex) => currentIndex !== index) })}>
                                Remove Frame
                            </button>
                        </div>
                    ))}
                </ArraySection>
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
