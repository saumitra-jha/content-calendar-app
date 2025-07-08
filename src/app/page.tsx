'use client';

import { useState, useRef, useEffect, useCallback } from "react";
import { DndContext, useDraggable, useDroppable, DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import VariationCard from "../components/VariationCard";
import { getSupabaseClient } from "../utils/supabaseClient";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser, useAuth } from '@clerk/nextjs';

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SCHEDULE_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-green-100 text-green-800 border-green-200",
  "bg-yellow-100 text-yellow-800 border-yellow-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-purple-100 text-purple-800 border-purple-200"
];
const VIEWS = ["Month", "Week", "Day"];
const EXPORT_PLATFORMS = ["Twitter", "All"];

function getMonthMatrix(year: number, month: number) {
  const matrix: (Date | null)[][] = [];
  const firstDay = new Date(year, month, 1);
  const current = new Date(year, month, 1 - firstDay.getDay());
  for (let week = 0; week < 6; week++) {
    const weekArr: (Date | null)[] = [];
    for (let day = 0; day < 7; day++) {
      weekArr.push(
        current.getMonth() === month ? new Date(current) : null
      );
      current.setDate(current.getDate() + 1);
    }
    matrix.push(weekArr);
  }
  return matrix;
}

function getWeekDates(date: Date) {
  const weekDates: Date[] = [];
  const day = date.getDay();
  for (let i = 0; i < 7; i++) {
    const weekDate = new Date(date);
    weekDate.setDate(date.getDate() - day + i);
    weekDates.push(weekDate);
  }
  return weekDates;
}

function exportCSV(rows: string[][], filename: string) {
  const csvContent = rows.map(row => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function DraggableVariation({ id, variation }: { id: string; variation: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`transition-transform ${isDragging ? "opacity-40 scale-95" : "hover:scale-105"}`}
    >
      <VariationCard variation={variation} />
    </div>
  );
}

export default function Home() {
  const { user } = useUser();
  const [idea, setIdea] = useState("");
  const [submittedIdea, setSubmittedIdea] = useState<string | null>(null);
  const [variations, setVariations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [view, setView] = useState<typeof VIEWS[number]>("Month");
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const monthMatrix = getMonthMatrix(calendarYear, calendarMonth);
  const [scheduled, setScheduled] = useState<{ [date: string]: { id: string, content: string }[] }>({});
  const [draggedVariation, setDraggedVariation] = useState<string | null>(null);
  const [exportPlatform, setExportPlatform] = useState(EXPORT_PLATFORMS[0]);
  const exportRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { getToken, isSignedIn, userId: clerkUserId } = useAuth();

  useEffect(() => {
    async function fetchScheduled() {
      if (!user) return;
      setFetching(true);
      setFetchError(null);
      let fromDate: string, toDate: string;
      if (view === "Month") {
        const first = new Date(calendarYear, calendarMonth, 1);
        const last = new Date(calendarYear, calendarMonth + 1, 0);
        fromDate = first.toISOString().slice(0, 10);
        toDate = last.toISOString().slice(0, 10);
      } else if (view === "Week") {
        const weekDates = getWeekDates(selectedDate);
        fromDate = weekDates[0].toISOString().slice(0, 10);
        toDate = weekDates[6].toISOString().slice(0, 10);
      } else {
        fromDate = toDate = selectedDate.toISOString().slice(0, 10);
      }
      const token = await getToken({ template: 'supabase' });
      const supabase = getSupabaseClient(token || undefined);
      const { data, error } = await supabase
        .from("scheduled_content")
        .select("id, date, content, platform, user_id")
        .eq("user_id", user.id)
        .gte("date", fromDate)
        .lte("date", toDate);
      setFetching(false);
      if (error) {
        setFetchError("Failed to fetch scheduled items: " + error.message);
      } else {
        const grouped: { [date: string]: { id: string, content: string }[] } = {};
        data?.forEach((row: { date: string; id: string; content: string }) => {
          if (!grouped[row.date]) grouped[row.date] = [];
          grouped[row.date].push({ id: row.id, content: row.content });
        });
        setScheduled(grouped);
      }
    }
    fetchScheduled();
  }, [view, calendarMonth, calendarYear, selectedDate, user, getToken]);

  useEffect(() => {
    const fetchToken = async () => {
      if (isSignedIn) {
        const token = await getToken({ template: 'supabase' });
        if (token) {
          // const payload = JSON.parse(atob(token.split('.')[1]));
          // console.log("Decoded JWT payload:", payload);
        }
      }
    };
    fetchToken();
  }, [getToken, isSignedIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;
    setSubmittedIdea(idea);
    setLoading(true);
    setError(null);
    setVariations([]);
    try {
      const res = await fetch("/api/generate-variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.variations)) {
        setVariations(data.variations);
      } else {
        setError(data.error || "Failed to generate variations.");
      }
    } catch {
      setError("Failed to generate variations.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setIdea("");
    setSubmittedIdea(null);
    setVariations([]);
    setError(null);
    setLoading(false);
    setScheduled({});
    setView("Month");
    setSelectedDate(today);
    setCalendarMonth(today.getMonth());
    setCalendarYear(today.getFullYear());
  };

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedVariation(String(event.active.id));
  };

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { over } = event;
    if (over && draggedVariation && String(over.id).startsWith("day-") && user) {
      const dateStr = String(over.id).replace("day-", "");
      const variationIdx = parseInt(draggedVariation.replace("variation-", ""), 10);
      if (!isNaN(variationIdx)) {
        const content = variations[variationIdx];
        setSaving(true);
        setSaveError(null);
        try {
          const token = await getToken({ template: 'supabase' });
          const supabase = getSupabaseClient(token || undefined);
          const { data, error } = await supabase.from("scheduled_content").insert([
            { date: dateStr, content, platform: "All", user_id: clerkUserId, title: "test" }
          ]).select();
          if (error) {
            setSaveError("Failed to save to Supabase: " + error.message);
          } else if (data && data[0]) {
            setScheduled((prev) => {
              const next = { ...prev };
              if (!next[dateStr]) next[dateStr] = [];
              next[dateStr] = [...next[dateStr], { id: data[0].id, content }];
              return next;
            });
          }
        } catch (err) {
          setSaveError("Unexpected error: " + (err as Error).message);
        } finally {
          setSaving(false);
        }
      }
    }
    setDraggedVariation(null);
  }, [user, draggedVariation, variations, clerkUserId, getToken]);

  const handlePrev = () => {
    if (view === "Month") {
      let newMonth = calendarMonth - 1;
      let newYear = calendarYear;
      if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      }
      setCalendarMonth(newMonth);
      setCalendarYear(newYear);
      setSelectedDate(new Date(newYear, newMonth, 1));
    } else if (view === "Week") {
      const prevWeek = new Date(selectedDate);
      prevWeek.setDate(selectedDate.getDate() - 7);
      setSelectedDate(prevWeek);
    } else if (view === "Day") {
      const prevDay = new Date(selectedDate);
      prevDay.setDate(selectedDate.getDate() - 1);
      setSelectedDate(prevDay);
    }
  };
  const handleNext = () => {
    if (view === "Month") {
      let newMonth = calendarMonth + 1;
      let newYear = calendarYear;
      if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      }
      setCalendarMonth(newMonth);
      setCalendarYear(newYear);
      setSelectedDate(new Date(newYear, newMonth, 1));
    } else if (view === "Week") {
      const nextWeek = new Date(selectedDate);
      nextWeek.setDate(selectedDate.getDate() + 7);
      setSelectedDate(nextWeek);
    } else if (view === "Day") {
      const nextDay = new Date(selectedDate);
      nextDay.setDate(selectedDate.getDate() + 1);
      setSelectedDate(nextDay);
    }
  };
  const handleToday = () => {
    setSelectedDate(today);
    setCalendarMonth(today.getMonth());
    setCalendarYear(today.getFullYear());
  };

  function getExportRows() {
    const items: { date: string; content: string }[] = [];
    if (view === "Month") {
      monthMatrix.flat().forEach(date => {
        if (date) {
          const dateStr = date.toISOString().slice(0, 10);
          (scheduled[dateStr] || []).forEach(item => {
            items.push({ date: dateStr, content: item.content });
          });
        }
      });
    } else if (view === "Week") {
      getWeekDates(selectedDate).forEach(date => {
        const dateStr = date.toISOString().slice(0, 10);
        (scheduled[dateStr] || []).forEach(item => {
          items.push({ date: dateStr, content: item.content });
        });
      });
    } else if (view === "Day") {
      const dateStr = selectedDate.toISOString().slice(0, 10);
      (scheduled[dateStr] || []).forEach(item => {
        items.push({ date: dateStr, content: item.content });
      });
    }
    return items;
  }

  function handleExport() {
    const items = getExportRows();
    if (exportPlatform === "Twitter") {
      const rows = [["Date", "Tweet"]];
      items.forEach(({ date, content }) => {
        rows.push([date, content]);
      });
      exportCSV(rows, `calendar-twitter-export.csv`);
    } else {
      const rows = [["Date", "Content", "Platform"]];
      items.forEach(({ date, content }) => {
        rows.push([date, content, "All"]);
      });
      exportCSV(rows, `calendar-all-export.csv`);
    }
  }

  async function handleDelete(dateStr: string, id: string) {
    setSaving(true);
    setSaveError(null);
    const token = await getToken({ template: 'supabase' });
    const supabase = getSupabaseClient(token || undefined);
    const { error } = await supabase.from("scheduled_content").delete().eq("id", id);
    setSaving(false);
    if (error) {
      setSaveError("Failed to delete from Supabase: " + error.message);
    } else {
      setScheduled((prev) => {
        const next = { ...prev };
        next[dateStr] = (next[dateStr] || []).filter((item: { id: string }) => item.id !== id);
        return next;
      });
    }
  }

  function DroppableDay({ id, scheduled, date, isToday }: { 
    id: string; 
    scheduled: { id: string; content: string }[]; 
    date: Date | null; 
    isToday: boolean; 
  }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
      <div
        ref={setNodeRef}
        className={`border rounded-lg min-h-[90px] flex flex-col items-start justify-start p-2 transition relative shadow-sm bg-gradient-to-br from-white to-gray-50 ${isOver ? "ring-2 ring-blue-300" : ""} ${isToday ? "border-blue-500 ring-2 ring-blue-400" : ""}`}
        style={{ minHeight: 90 }}
      >
        {date && (
          <span className={`text-xs font-bold mb-1 ${isToday ? "text-blue-600" : "text-gray-500"}`}>{date.getDate()}</span>
        )}
        {scheduled.length > 0 ? (
          <div className="flex flex-col gap-1 w-full mt-1">
            {scheduled.map((item) => (
              <span
                key={item.id}
                className={`flex items-center justify-between text-xs font-semibold text-left break-words rounded px-2 py-1 border ${SCHEDULE_COLORS[0]} shadow-sm w-full`}
              >
                <span className="flex-1">{item.content}</span>
                <button
                  className="ml-2 text-red-500 hover:text-red-700 font-bold px-1"
                  title="Delete"
                  onClick={() => {
                    if (date) {
                      handleDelete(date.toISOString().slice(0, 10), item.id);
                    }
                  }}
                >
                  🗑️
                </button>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-300 text-xs mt-1">Drop here</span>
        )}
      </div>
    );
  }

  function renderMonthView() {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={handlePrev}
            className="px-2 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold shadow"
          >
            &lt;
          </button>
          <h2 className="text-2xl font-extrabold text-center text-purple-700 tracking-wide">
            {new Date(calendarYear, calendarMonth).toLocaleString("default", { month: "long" })} {calendarYear}
          </h2>
          <button
            onClick={handleNext}
            className="px-2 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold shadow"
          >
            &gt;
          </button>
        </div>
        <div className="flex justify-center mb-4">
          <button
            onClick={handleToday}
            className="px-3 py-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold shadow"
          >
            Today
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="text-xs font-bold text-center text-blue-400 uppercase tracking-wider">{wd}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2 bg-white/80 p-4 rounded-2xl shadow-lg border border-purple-100">
          {monthMatrix.flat().map((date, idx) => {
            const dateStr = date ? date.toISOString().slice(0, 10) : `empty-${idx}`;
            const isToday = date && date.toDateString() === today.toDateString();
            return (
              <DroppableDay
                key={dateStr}
                id={`day-${dateStr}`}
                scheduled={date ? scheduled[dateStr] || [] : []}
                date={date}
                isToday={!!isToday}
              />
            );
          })}
        </div>
      </div>
    );
  }

  function renderWeekView() {
    const weekDates = getWeekDates(selectedDate);
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={handlePrev}
            className="px-2 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold shadow"
          >
            &lt;
          </button>
          <h2 className="text-2xl font-extrabold text-center text-purple-700 tracking-wide">
            Week of {weekDates[0].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </h2>
          <button
            onClick={handleNext}
            className="px-2 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold shadow"
          >
            &gt;
          </button>
        </div>
        <div className="flex justify-center mb-4">
          <button
            onClick={handleToday}
            className="px-3 py-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold shadow"
          >
            Today
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2 bg-white/80 p-4 rounded-2xl shadow-lg border border-purple-100">
          {weekDates.map((date, idx) => {
            const dateStr = date.toISOString().slice(0, 10);
            const isToday = date.toDateString() === today.toDateString();
            return (
              <DroppableDay
                key={dateStr}
                id={`day-${dateStr}`}
                scheduled={scheduled[dateStr] || []}
                date={date}
                isToday={!!isToday}
              />
            );
          })}
        </div>
      </div>
    );
  }

  function renderDayView() {
    const date = selectedDate;
    const dateStr = date.toISOString().slice(0, 10);
    const isToday = date.toDateString() === today.toDateString();
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={handlePrev}
            className="px-2 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold shadow"
          >
            &lt;
          </button>
          <h2 className="text-2xl font-extrabold text-center text-purple-700 tracking-wide">
            {date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </h2>
          <button
            onClick={handleNext}
            className="px-2 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold shadow"
          >
            &gt;
          </button>
        </div>
        <div className="flex justify-center mb-4">
          <button
            onClick={handleToday}
            className="px-3 py-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold shadow"
          >
            Today
          </button>
        </div>
        <div className="bg-white/80 p-6 rounded-2xl shadow-lg border border-purple-100 min-h-[120px] flex flex-col gap-2">
          <DroppableDay
            id={`day-${dateStr}`}
            scheduled={scheduled[dateStr] || []}
            date={date}
            isToday={!!isToday}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full flex justify-end items-center gap-2 mb-2">
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
      <h1 className="text-4xl font-extrabold mb-6 text-center text-blue-700 drop-shadow">Content Calendar App</h1>
      <SignedOut>
        <div className="bg-white/90 rounded-2xl shadow-lg p-8 max-w-md text-center border border-blue-100 mt-8">
          <p className="text-lg font-semibold text-blue-800 mb-4">Please sign in or create an account to use the Content Calendar App.</p>
          <div className="flex justify-center gap-4">
            <SignInButton mode="modal">
              <button className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 transition">Sign In</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="bg-purple-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-600 transition">Sign Up</button>
            </SignUpButton>
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        {fetching && <div className="text-blue-600 font-semibold mb-2">Loading scheduled items...</div>}
        {fetchError && <div className="text-red-600 font-semibold mb-2">{fetchError}</div>}
        {saving && <div className="text-blue-600 font-semibold mb-2">Saving to Supabase...</div>}
        {saveError && <div className="text-red-600 font-semibold mb-2">{saveError}</div>}
        {submittedIdea && (
          <div className="flex gap-2 mb-6 items-center" ref={exportRef}>
            <label className="font-semibold text-purple-700">Export for:</label>
            <select
              value={exportPlatform}
              onChange={e => setExportPlatform(e.target.value)}
              className="rounded-lg border border-purple-200 px-3 py-1 text-purple-700 bg-white shadow focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              {EXPORT_PLATFORMS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button
              onClick={handleExport}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg px-4 py-2 font-bold hover:from-blue-600 hover:to-purple-600 transition-colors shadow"
            >
              Export
            </button>
          </div>
        )}
        {!submittedIdea ? (
          <form onSubmit={handleSubmit} className="bg-white/90 rounded-2xl shadow-lg p-8 w-full max-w-md flex flex-col gap-4 mb-8 border border-blue-100">
            <label htmlFor="idea" className="text-lg font-semibold text-blue-800">Enter a content idea:</label>
            <input
              id="idea"
              type="text"
              value={idea}
              onChange={e => setIdea(e.target.value)}
              className="border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50/50 text-blue-900 placeholder:text-blue-300"
              placeholder="e.g. 5 tips for productivity"
              required
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg px-4 py-2 font-bold hover:from-blue-600 hover:to-purple-600 transition-colors mt-2 shadow"
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate Variations"}
            </button>
          </form>
        ) : (
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="w-full flex flex-col md:flex-row gap-8">
              <div className="md:w-1/3 w-full flex flex-col gap-4">
                <h2 className="text-xl font-bold mb-2 text-center md:text-left text-purple-700">Content Variations</h2>
                <div className="grid grid-cols-1 gap-4">
                  {variations.map((variation, idx) => (
                    <DraggableVariation key={idx} id={`variation-${idx}`} variation={variation} />
                  ))}
                </div>
              </div>
              <div className="md:w-2/3 w-full">
                <div className="flex gap-2 mb-4 justify-center">
                  {VIEWS.map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={`px-4 py-2 rounded-full font-bold shadow transition-colors border-2 ${view === v ? "bg-purple-500 text-white border-purple-500" : "bg-white text-purple-700 border-purple-200 hover:bg-purple-100"}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                {view === "Month" && renderMonthView()}
                {view === "Week" && renderWeekView()}
                {view === "Day" && renderDayView()}
                <button
                  onClick={handleReset}
                  className="mt-8 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-lg px-4 py-2 font-bold hover:from-blue-200 hover:to-purple-200 transition-colors w-full md:w-auto shadow"
                  disabled={loading}
                >
                  Try Another Idea
                </button>
              </div>
            </div>
          </DndContext>
        )}
        {error && <div className="text-center text-red-600 my-6 font-semibold">{error}</div>}
      </SignedIn>
    </div>
  );
}
