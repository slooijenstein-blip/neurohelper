import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isProAccount, showProChrome, tabsForAccount } from "./pro-access.ts";

describe("pro access", () => {
  it("keeps the caregiver tabs and withholds Pro unless the flag is on", () => {
    const parent = tabsForAccount(false);
    const pro = tabsForAccount(true);

    assert.equal(isProAccount({ isPro: true }), true);
    assert.equal(isProAccount({ isPro: false }), false);
    assert.equal(isProAccount(null), false);
    assert.equal(isProAccount({}), false);

    assert.deepEqual(parent, ["activities", "schedule", "journey", "community", "help", "profile"]);
    assert.equal(parent.includes("pro"), false);
    assert.ok(parent.includes("activities"));
    assert.ok(parent.includes("community"));

    for (const tab of parent) assert.ok(pro.includes(tab));
    assert.ok(pro.includes("pro"));
    assert.equal(pro[0], "activities");
    assert.equal(pro[1], "pro");
  });

  it("shows Pro chrome from Clerk metadata, and from the device demo only when that flag is passed", () => {
    assert.equal(showProChrome({ clerkIsPro: true, deviceDemo: false }), true);
    assert.equal(showProChrome({ clerkIsPro: false, deviceDemo: false }), false);
    assert.equal(showProChrome({ clerkIsPro: false, deviceDemo: true }), true);
    assert.equal(isProAccount({ role: "Therapist" } as { isPro?: boolean }), false);
  });
});
