'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { StorybookXml } from '@/types/sbplus';

function EditorScreen() {
  const searchParams = useSearchParams();
  const path = searchParams.get('path');
  const [data, setData] = useState<StorybookXml | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) return;

    window.electronAPI.loadPresentationData(path).then((res) => {
      if (res.success) {
        console.log('Parsed sbplus.xml:', res.data);
        setData(res.data);
      } else {
        console.error(res.error);
        setError(res.error);
      }
    });
  }, [path]);

  if (error) {
    return <p className="text-red-500">Error loading XML: {error}</p>;
  }

  if (!data) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{data.storybook?.setup?.title}</h1>
      <p className="text-sm text-gray-500">Author: {data.storybook?.setup?.author?.name}</p>
      <p className="text-sm text-gray-400">Subtitle: {data.storybook?.setup?.subtitle}</p>
      <p className="text-sm mt-4">Sections: {Array.isArray(data.storybook.section) ? data.storybook.section.length : 1}</p>
    </div>
  );
}

export default EditorScreen;