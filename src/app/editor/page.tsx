import { Suspense } from "react";
import AuthoringScreen from "@/features/authoring/AuthoringScreen";

export default function EditorPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-400">Loading editor...</p>}>
      <AuthoringScreen />
    </Suspense>
  );
}
