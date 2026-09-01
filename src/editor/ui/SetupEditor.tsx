'use client';

import { showToast } from '@/app/utils/toast';
import { useEditor } from '@/editor/state/EditorContext';
import type { Setup } from '@/types/sbplus';

export default function SetupEditor() {
    const { state, dispatch } = useEditor();

    const setup = state.xml!.storybook.setup ?? ({} as Setup);

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

    const updateSetupAttr = (field: string, value: string) => {
        dispatch({
            type: 'updateSetupAttr',
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

    const importSplashImage = async () => {
        const result = await window.electronAPI.importPresentationAsset({
            presentationPath: state.presentationPath,
            kind: 'splash-image',
            imageFormat: state.xml!.storybook.$?.splashImgFormat || 'jpg',
        });

        if (result.success) {
            updateSetupAttr('splashImg', '');
            showToast('Splash image imported.', 'success');
            return;
        }

        if (result.error !== 'Import canceled.') {
            showToast(result.error, 'error');
        }
    };

    return (
        <>
            <div className='space-y-4 bg-base-200 border-base-100 rounded-box border p-4'>
                {/* STORYBOOK GLOBAL SETTINGS */}
                <div className='divider divider-info mb-4'>Storybook Settings</div>

                {/* Accent Color */}
                <label className='floating-label'>
                    <span>Accent Color (hex)</span>
                    <input className='input input-md w-full' placeholder='Accent Color (hex)' value={state.xml!.storybook.$?.accent ?? ''} onChange={(e) => updateStorybookAttr('accent', e.target.value)} />
                </label>

                {/* Page Image Format */}
                <label className='floating-label'>
                    <span>Page Image Format</span>
                    <input className='input input-md w-full' placeholder='Page Image Format' value={state.xml!.storybook.$?.pageImgFormat ?? ''} onChange={(e) => updateStorybookAttr('pageImgFormat', e.target.value)} />
                </label>

                {/* Splash Image Format */}
                <label className='floating-label'>
                    <span>Splash Image Format</span>
                    <input className='input input-md w-full' placeholder='Splash Image Format' value={state.xml!.storybook.$?.splashImgFormat ?? ''} onChange={(e) => updateStorybookAttr('splashImgFormat', e.target.value)} />
                </label>

                {/* Downloadable File Name */}
                <label className='floating-label'>
                    <span>Downloadable File Name</span>
                    <input className='input input-md w-full' placeholder='Downloadable File Name' value={state.xml!.storybook.$?.downloadableFileName ?? ''} onChange={(e) => updateStorybookAttr('downloadableFileName', e.target.value)} />
                </label>

                <div className='flex flex-col gap-3 pt-1'>
                    {/* Analytics Toggle */}
                    <label className='label justify-start gap-3 py-0'>
                        <input type='checkbox' className='checkbox checkbox-md' checked={state.xml!.storybook.$?.analytics === 'on'} onChange={(e) => updateStorybookAttr('analytics', e.target.checked ? 'on' : 'off')} />
                        Enable Analytics
                    </label>

                    {/* MathJax Toggle */}
                    <label className='label justify-start gap-3 py-0'>
                        <input type='checkbox' className='checkbox checkbox-md' checked={state.xml!.storybook.$?.mathjax === 'on'} onChange={(e) => updateStorybookAttr('mathjax', e.target.checked ? 'on' : 'off')} />
                        Enable MathJax
                    </label>
                </div>
            </div>
            <div className='space-y-6 bg-base-200 border-base-100 rounded-box border p-4 mt-6'>
                <div className='divider divider-info mb-6'>Presentation Setup</div>

                {/* Title */}
                <label className='floating-label'>
                    <span>Title</span>
                    <input className='input input-md w-full' placeholder='Title' value={setup.title ?? ''} onChange={(e) => update('title', e.target.value)} />
                </label>

                {/* Subtitle */}
                <label className='floating-label'>
                    <span>Subtitle</span>
                    <input className='input input-md w-full' placeholder='Subtitle' value={setup.subtitle ?? ''} onChange={(e) => update('subtitle', e.target.value)} />
                </label>

                {/* Length */}
                <label className='floating-label'>
                    <span>Duration (length)</span>
                    <input className='input input-md w-full' placeholder='Duration (length)' value={setup.length ?? ''} onChange={(e) => update('length', e.target.value)} />
                </label>

                {/* Splash Image */}
                <div className='join w-full'>
                    <label className='floating-label join-item flex-1'>
                        <span>Splash Image</span>
                        <input className='input input-md join-item w-full' placeholder='Splash Image' value={setup.$?.splashImg ?? ''} onChange={(e) => updateSetupAttr('splashImg', e.target.value)} />
                    </label>
                    <button type='button' className='btn btn-md btn-outline join-item' onClick={importSplashImage}>
                        Upload Splash Image
                    </button>
                </div>

                {/* Author Name */}
                <label className='floating-label'>
                    <span>Author Name</span>
                    <input className='input input-md w-full' placeholder='Author Name' value={setup.author?.$?.name ?? ''} onChange={(e) => updateAuthor(e.target.value)} />
                </label>

                {/* Author Biography */}
                <label className='floating-label'>
                    <span>Author Biography</span>
                    <textarea className='textarea w-full' placeholder='Author Biography' rows={5} value={setup.author?._ ?? ''} onChange={(e) => updateAuthorBio(e.target.value)} />
                </label>

                {/* General Info */}
                <label className='floating-label'>
                    <span>General Information</span>
                    <textarea className='textarea w-full' placeholder='General Information' rows={4} value={setup.generalInfo ?? ''} onChange={(e) => update('generalInfo', e.target.value)} />
                </label>
            </div>
        </>
    );
}
