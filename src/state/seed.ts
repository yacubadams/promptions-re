import { CoverageArea, Turn } from "../types";
import { uid } from "./interviewModel";

// Room-booking elicitation sample (Sara from Ops, Tom from Facilities).
export const seedCoverage: CoverageArea[] = [
    { id: "CV-1", label: "Booking conflicts & double-booking", status: "open" },
    { id: "CV-2", label: "Approval / authorisation workflow", status: "open" },
    { id: "CV-3", label: "Notifications & reminders", status: "open" },
    { id: "CV-4", label: "Reporting & utilisation", status: "open" },
    { id: "CV-5", label: "Access control / who can book", status: "open" },
];

export const seedTurns: Turn[] = [
    {
        id: uid("t"),
        speaker: "Interviewer",
        role: "interviewer",
        text: "Walk me through how room booking works today.",
        ts: Date.now(),
    },
    {
        id: uid("t"),
        speaker: "Sara (Ops)",
        role: "stakeholder",
        text: "Right now people email Facilities and Tom keeps a shared spreadsheet. We get double-bookings almost every week, especially for the big conference room.",
        ts: Date.now(),
    },
    {
        id: uid("t"),
        speaker: "Tom (Facilities)",
        role: "stakeholder",
        text: "And some rooms need my sign-off because they have AV kit, but there's no real approval step, people just assume it's free.",
        ts: Date.now(),
    },
];
