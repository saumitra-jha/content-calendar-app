"use client";
import { useState } from "react";

interface ContentIdeaFormProps {
  onSubmit: (idea: string) => void;
}

export default function ContentIdeaForm({ onSubmit }: ContentIdeaFormProps) {
  const [idea, setIdea] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim()) {
      onSubmit(idea);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 w-full max-w-md flex flex-col gap-4">
      <label htmlFor="idea" className="text-lg font-medium">Enter a content idea:</label>
      <input
        id="idea"
        type="text"
        value={idea}
        onChange={e => setIdea(e.target.value)}
        className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder="e.g. 5 tips for productivity"
        required
      />
      <button
        type="submit"
        className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition-colors mt-2"
      >
        Generate Variations
      </button>
    </form>
  );
} 