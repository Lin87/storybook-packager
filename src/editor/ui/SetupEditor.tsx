'use client';

import { useEditor } from '@/editor/state/EditorContext';

export default function SetupEditor() {
    const { state } = useEditor();

    const setup = state.xml!.storybook.setup;

    return (
        <div className='space-y-4'>
            <h2 className='text-xl font-semibold'>Presentation Setup</h2>

            <div className='text-sm text-gray-600'>
                <p>
                    <strong>Title:</strong> {setup.title}
                </p>
                {setup.subtitle && (
                    <p>
                        <strong>Subtitle:</strong> {setup.subtitle}
                    </p>
                )}
                {setup.length && (
                    <p>
                        <strong>Length:</strong> {setup.length}
                    </p>
                )}
                {setup.author && (
                    <p>
                        <strong>Author:</strong> {setup.author.$?.name}
                    </p>
                )}
            </div>

            <p className='text-gray-400 text-xs'>(Setup editor UI will be implemented in later steps)</p>
        </div>
    );
}
