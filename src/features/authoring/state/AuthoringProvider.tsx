'use client';

import { createContext, useContext, useReducer } from 'react';
import { authoringReducer, initialAuthoringState } from './authoringReducer';
import type { AuthoringState, AuthoringAction } from './authoringTypes';

interface EditorContextValue {
    state: AuthoringState;
    dispatch: React.Dispatch<AuthoringAction>;
}

const EditorContext = createContext<EditorContextValue | undefined>(undefined);

export default function AuthoringProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(authoringReducer, initialAuthoringState);

    return <EditorContext.Provider value={{ state, dispatch }}>{children}</EditorContext.Provider>;
}

export function useAuthoring() {
    const ctx = useContext(EditorContext);

    if (!ctx) {
        throw new Error('useAuthoring() must be used inside <AuthoringProvider>');
    }
    
    return ctx;
}
