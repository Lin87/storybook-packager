'use client';

import { useEffect } from 'react';

export default function SystemThemeSync() {
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const syncTheme = () => {
            document.documentElement.classList.toggle('dark', mediaQuery.matches);
            document.body.classList.toggle('dark', mediaQuery.matches);
        };

        syncTheme();
        mediaQuery.addEventListener('change', syncTheme);

        return () => {
            mediaQuery.removeEventListener('change', syncTheme);
        };
    }, []);

    return null;
}
