"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const generateVariations = (idea: string) => {
  // Dummy variations for now
  return [
    `${idea} (for Instagram)`,
    `${idea} (for Twitter)`,
    `${idea} (for LinkedIn)`,
    `${idea} (in a fun tone)`,
    `${idea} (in a professional tone)`
  ];
};

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idea = searchParams.get("idea") || "";
  const [variations, setVariations] = useState<string[]>([]);

  useEffect(() => {
    if (idea) {
      setVariations(generateVariations(idea));
    }
  }, [idea]);

  if (!idea) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-lg">No content idea provided.</p>
        <button className="mt-4 text-blue-600 underline" onClick={() => router.push("/")}>Go back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">AI-Generated Variations</h1>
      <ul className="bg-white rounded-lg shadow-md p-6 w-full max-w-md flex flex-col gap-3 mb-6">
        {variations.map((variation, idx) => (
          <li key={idx} className="border-b last:border-b-0 py-2 text-gray-800">{variation}</li>
        ))}
      </ul>
      <button
        className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition-colors"
        onClick={() => router.push(`/calendar?idea=${encodeURIComponent(idea)}`)}
      >
        Schedule on Calendar
      </button>
    </div>
  );
} 