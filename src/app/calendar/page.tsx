'use client';
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const generateVariations = (idea: string) => [
  `${idea} (for Instagram)`,
  `${idea} (for Twitter)`,
  `${idea} (for LinkedIn)`,
  `${idea} (in a fun tone)`,
  `${idea} (in a professional tone)`
];

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const idea = searchParams.get("idea") || "";
  const [variations, setVariations] = useState<string[]>([]);
  const [scheduled, setScheduled] = useState<(string | null)[]>(Array(7).fill(null));
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (idea) {
      setVariations(generateVariations(idea));
    }
  }, [idea]);

  // Remove a variation from the unscheduled list when it's scheduled
  const unscheduled = variations.filter(
    v => !scheduled.includes(v)
  );

  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDrop = (dayIdx: number) => {
    if (draggedIdx !== null && unscheduled[draggedIdx]) {
      const newScheduled = [...scheduled];
      newScheduled[dayIdx] = unscheduled[draggedIdx];
      setScheduled(newScheduled);
      setDraggedIdx(null);
    }
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Schedule Your Content</h1>
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl">
        {/* Unscheduled Variations */}
        <div className="flex-1">
          <h2 className="text-lg font-semibold mb-2">Unscheduled Variations</h2>
          <ul className="bg-white rounded-lg shadow-md p-4 flex flex-col gap-2 min-h-[200px]">
            {unscheduled.length === 0 && <li className="text-gray-400">All scheduled!</li>}
            {unscheduled.map((variation, idx) => (
              <li
                key={variation}
                className="border rounded px-3 py-2 bg-blue-100 cursor-grab hover:bg-blue-200"
                draggable
                onDragStart={() => handleDragStart(idx)}
              >
                {variation}
              </li>
            ))}
          </ul>
        </div>
        {/* Calendar Grid */}
        <div className="flex-1">
          <h2 className="text-lg font-semibold mb-2">Calendar (1 week)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {daysOfWeek.map((day, idx) => (
              <div
                key={day}
                className="bg-white rounded-lg shadow p-4 min-h-[80px] flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors"
                onDrop={() => handleDrop(idx)}
                onDragOver={handleDragOver}
              >
                <div className="font-semibold mb-2">{day}</div>
                {scheduled[idx] ? (
                  <div className="bg-blue-200 rounded px-2 py-1 text-center text-sm">{scheduled[idx]}</div>
                ) : (
                  <div className="text-gray-400 text-sm">Drop here</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 