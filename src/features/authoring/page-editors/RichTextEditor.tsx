'use client';

import { SimpleEditor } from '@/vendor/tiptap/tiptap-templates/simple/simple-editor';

interface RichTextEditorProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    minHeightClassName?: string;
}

export default function RichTextEditor({ label, value, onChange, minHeightClassName = 'min-h-32' }: RichTextEditorProps) {
    return (
        <div className='form-control flex flex-col gap-4 rich-text-editor'>
            <label className='label py-0'>
                <span className='label-text'>{label}</span>
            </label>
            <div className='rounded-box border border-base-300 bg-base-100 overflow-hidden'>
                <SimpleEditor
                    value={value}
                    onChange={onChange}
                    minHeightClassName={minHeightClassName}
                    ariaLabel={`${label} rich text editor`}
                />
            </div>
        </div>
    );
}
