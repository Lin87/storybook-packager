import AuthoringProvider from '@/features/authoring/state/AuthoringProvider';

export default function EditorLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthoringProvider>
            <div className='h-full w-full flex flex-col'>{children}</div>
        </AuthoringProvider>
    );
}
