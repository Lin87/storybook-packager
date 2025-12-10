'use client';

import { createContext, useContext, useReducer } from 'react';
import { editorReducer, initialEditorState } from './editorReducer';
import type { EditorState, EditorAction } from './editorTypes';

interface EditorContextValue {
    state: EditorState;
    dispatch: React.Dispatch<EditorAction>;
}

const EditorContext = createContext<EditorContextValue | undefined>(undefined);

export default function EditorProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(editorReducer, initialEditorState);

    return <EditorContext.Provider value={{ state, dispatch }}>{children}</EditorContext.Provider>;
}

export function useEditor() {
    const ctx = useContext(EditorContext);

    if (!ctx) {
        throw new Error('useEditor() must be used inside <EditorProvider>');
    }
    
    return ctx;
}
