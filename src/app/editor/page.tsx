import { Suspense } from "react";
import EditorScreen from "../components/EditorScreen";

export default function EditorPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-400">Loading editor...</p>}>
      <EditorScreen />
    </Suspense>
  );
}
