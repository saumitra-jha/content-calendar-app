import { Suspense } from "react";
import CalendarPage from "./CalendarPage"; // or your actual component

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CalendarPage />
    </Suspense>
  );
}
