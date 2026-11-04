import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { accountChrome, isProAccount, showProChrome, tabsForAccount } from "./pro-access.ts";

describe("pro access", () => {
  it("keeps the caregiver tabs and withholds Pro unless the flag is on", () => {
    const parent = tabsForAccount(false, true);
    const alone = tabsForAccount(false);
    const pro = tabsForAccount(true, true);

    assert.equal(isProAccount({ isPro: true }), true);
    assert.equal(isProAccount({ isPro: false }), false);
    assert.equal(isProAccount(null), false);
    assert.equal(isProAccount({}), false);

    assert.deepEqual(parent, [
      "activities",
      "children",
      "schedule",
      "journey",
      "community",
      "help",
      "profile",
    ]);
    assert.equal(parent.includes("pro"), false);
    assert.equal(parent.includes("children"), true);
    assert.equal(alone.includes("children"), false);
    assert.equal(alone.includes("pro"), false);
    assert.deepEqual(alone, [
      "activities",
      "schedule",
      "journey",
      "community",
      "help",
      "profile",
    ]);
    assert.ok(parent.includes("activities"));
    assert.ok(parent.includes("community"));

    assert.equal(pro.includes("children"), false);
    assert.ok(pro.includes("pro"));
    assert.equal(pro[0], "activities");
    assert.equal(pro[1], "pro");
    assert.ok(pro.includes("schedule"));
  });

  it("shows Created activities to Creator Pro and the founder, and leaves regular Pro unchanged", () => {
    const base = {
      demoOverlay: false,
      profile: null,
      clerkIsPro: false,
      clerkIsCreatorPro: false,
      founder: false,
      devPro: false,
      devCreator: false,
      devFounder: false,
    };
    assert.deepEqual(accountChrome({ ...base, clerkIsPro: true }), {
      isPro: true,
      showCreated: false,
    });
    assert.deepEqual(accountChrome({ ...base, clerkIsPro: true, clerkIsCreatorPro: true }), {
      isPro: true,
      showCreated: true,
    });
    assert.deepEqual(accountChrome({ ...base, founder: true }), {
      isPro: true,
      showCreated: true,
    });
    assert.deepEqual(
      accountChrome({
        ...base,
        demoOverlay: true,
        profile: { isPro: true, role: "Therapist" },
      }),
      { isPro: true, showCreated: false },
    );
    assert.deepEqual(accountChrome(base), { isPro: false, showCreated: false });
  });

  it("shows Pro chrome from Clerk metadata, and from the device demo only when that flag is passed", () => {
    assert.equal(showProChrome({ clerkIsPro: true, deviceDemo: false }), true);
    assert.equal(showProChrome({ clerkIsPro: false, deviceDemo: false }), false);
    assert.equal(showProChrome({ clerkIsPro: false, deviceDemo: true }), true);
    assert.equal(isProAccount({ role: "Therapist" } as { isPro?: boolean }), false);
  });
});
