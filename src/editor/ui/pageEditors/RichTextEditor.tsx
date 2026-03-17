'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface RichTextEditorProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    minHeightClassName?: string;
}

function ToolbarButton({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
    return (
        <button
            type='button'
            className={`btn btn-xs ${active ? 'btn-primary' : 'btn-ghost'}`}
            onClick={onClick}>
            {label}
        </button>
    );
}

export default function RichTextEditor({ label, value, onChange, minHeightClassName = 'min-h-32' }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [StarterKit],
        content: value || '',
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: `tiptap-editor focus:outline-none px-3 py-2 ${minHeightClassName}`,
            },
        },
        onUpdate: ({ editor: currentEditor }) => {
            onChange(currentEditor.isEmpty ? '' : currentEditor.getHTML());
        },
    });

    useEffect(() => {
        if (!editor) return;
        const currentHtml = editor.isEmpty ? '' : editor.getHTML();
        if (currentHtml === (value || '')) return;
        editor.commands.setContent(value || '', { emitUpdate: false });
    }, [editor, value]);

    return (
        <div className='form-control gap-2'>
            <label className='label py-0'>
                <span className='label-text'>{label}</span>
            </label>
            <div className='rounded-box border border-base-300 bg-base-100'>
                <div className='flex flex-wrap gap-1 border-b border-base-300 p-2'>
                    <ToolbarButton label='B' onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} />
                    <ToolbarButton label='I' onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} />
                    <ToolbarButton label='H2' onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} />
                    <ToolbarButton label='UL' onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} />
                    <ToolbarButton label='OL' onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} />
                    <ToolbarButton label='Undo' onClick={() => editor?.chain().focus().undo().run()} />
                    <ToolbarButton label='Redo' onClick={() => editor?.chain().focus().redo().run()} />
                </div>
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
