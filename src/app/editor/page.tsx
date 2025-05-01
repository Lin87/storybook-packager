'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditorScreen() {
  const searchParams = useSearchParams();
  const path = searchParams.get('path');

  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (!path) return;
    // Here you can call a preload-exposed function to validate or load sbplus.xml
    console.log('Editor opened for:', path);
    setValid(true); // Simulate valid check
  }, [path]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Storybook Editor</h1>
      {valid ? (
        <p className="text-sm text-green-600">Loaded: {path}</p>
      ) : (
        <p className="text-sm text-red-500">Invalid or missing presentation path.</p>
      )}
    </div>
  );
}
