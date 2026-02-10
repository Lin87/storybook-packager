import EditorProvider from '@/editor/state/EditorContext';

export default function EditorLayout({ children }: { children: React.ReactNode }) {
    return (
        <EditorProvider>
            <div className='h-full w-full flex flex-col'>{children}</div>
        </EditorProvider>
    );
}
