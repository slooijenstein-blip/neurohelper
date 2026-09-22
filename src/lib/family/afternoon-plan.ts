import { nid, type TimeBlock } from "./types";

/** Flagship ~1-hour afternoon skeleton. Titles are editable after insert. */
export function createAfternoonPlanBlocks(): TimeBlock[] {
  return [
    {
      id: nid("blk"),
      start: "15:00",
      minutes: 15,
      title: "Settle in",
      notes: "Shoes off, a drink of water, and a quick check-in.",
      done: false,
    },
    {
      id: nid("blk"),
      start: "15:15",
      minutes: 20,
      title: "Main activity",
      notes: "One focused activity from the library.",
      done: false,
    },
    {
      id: nid("blk"),
      start: "15:35",
      minutes: 15,
      title: "Movement",
      notes: "Burn a little energy before the evening.",
      done: false,
    },
    {
      id: nid("blk"),
      start: "15:50",
      minutes: 10,
      title: "Wind down",
      notes: "Quiet play or a short story.",
      done: false,
    },
  ];
}
