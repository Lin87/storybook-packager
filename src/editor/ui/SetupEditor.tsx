'use client';

import { useEditor } from '@/editor/state/EditorContext';

export default function SetupEditor() {
    const { state, dispatch } = useEditor();

    const setup = state.xml!.storybook.setup;

    const update = (field: string, value: string) => {
        dispatch({
            type: 'updateSetupField',
            payload: { field, value },
        });
    };

    const updateStorybookAttr = (field: string, value: string) => {
        dispatch({
            type: 'updateStorybookAttr',
            payload: { field, value },
        });
    };

    const updateAuthor = (value: string) => {
        dispatch({
            type: 'updateAuthorName',
            payload: { value },
        });
    };

    const updateAuthorBio = (value: string) => {
        dispatch({
            type: 'updateAuthorBio',
            payload: { value },
        });
    };

    return (
        <div className='space-y-6'>
            {/* STORYBOOK GLOBAL SETTINGS */}
            <div className='divider mb-6'>Storybook Settings</div>

            {/* Accent Color */}
            <div className='form-control'>
                <label className='label'>Accent Color (hex)</label>
                <input className='input input-bordered' value={state.xml!.storybook.$?.accent ?? ''} onChange={(e) => updateStorybookAttr('accent', e.target.value)} />
            </div>

            {/* Page Image Format */}
            <div className='form-control'>
                <label className='label'>Page Image Format</label>
                <input className='input input-bordered' value={state.xml!.storybook.$?.pageImgFormat ?? ''} onChange={(e) => updateStorybookAttr('pageImgFormat', e.target.value)} />
            </div>

            {/* Splash Image Format */}
            <div className='form-control'>
                <label className='label'>Splash Image Format</label>
                <input className='input input-bordered' value={state.xml!.storybook.$?.splashImgFormat ?? ''} onChange={(e) => updateStorybookAttr('splashImgFormat', e.target.value)} />
            </div>

            {/* Downloadable File Name */}
            <div className='form-control'>
                <label className='label'>Downloadable File Name</label>
                <input className='input input-bordered' value={state.xml!.storybook.$?.downloadableFileName ?? ''} onChange={(e) => updateStorybookAttr('downloadableFileName', e.target.value)} />
            </div>

            {/* MathJax Toggle */}
            <div className='form-control flex flex-row items-center gap-3 mt-2'>
                <label className='label cursor-pointer'>
                    <span className='label-text'>Enable MathJax</span>
                </label>

                <input type='checkbox' className='checkbox checkbox-primary' checked={state.xml!.storybook.$?.mathjax === 'on'} onChange={(e) => updateStorybookAttr('mathjax', e.target.checked ? 'on' : 'off')} />
            </div>

            <div className='divider my-6'>Presentation Setup</div>

            {/* Title */}
            <div className='form-control'>
                <label className='label'>Title</label>
                <input className='input input-bordered' value={setup.title ?? ''} onChange={(e) => update('title', e.target.value)} />
            </div>

            {/* Subtitle */}
            <div className='form-control'>
                <label className='label'>Subtitle</label>
                <input className='input input-bordered' value={setup.subtitle ?? ''} onChange={(e) => update('subtitle', e.target.value)} />
            </div>

            {/* Length */}
            <div className='form-control'>
                <label className='label'>Duration (length)</label>
                <input className='input input-bordered' value={setup.length ?? ''} onChange={(e) => update('length', e.target.value)} />
            </div>

            {/* Author Name */}
            <div className='form-control'>
                <label className='label'>Author Name</label>
                <input className='input input-bordered' value={setup.author?.$?.name ?? ''} onChange={(e) => updateAuthor(e.target.value)} />
            </div>

            {/* Author Biography */}
            <div className='form-control'>
                <label className='label'>Author Biography</label>
                <textarea className='textarea textarea-bordered' rows={5} value={setup.author?._ ?? ''} onChange={(e) => updateAuthorBio(e.target.value)} />
            </div>

            {/* General Info */}
            <div className='form-control'>
                <label className='label'>General Information</label>
                <textarea className='textarea textarea-bordered' rows={4} value={setup.generalInfo ?? ''} onChange={(e) => update('generalInfo', e.target.value)} />
            </div>

            <p className='text-xs text-gray-500'>Editing setup fields updates the XML structure directly. Saving & exporting will come later.</p>
        </div>
    );
}
