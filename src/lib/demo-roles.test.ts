import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { demoPersonaGrantsPro, demoRolesAllowed, parseDemoPersona } from "./demo-roles.ts";

describe("demo roles", () => {
  it("allows the switcher on local and Vercel preview hosts only", () => {
    assert.equal(demoRolesAllowed("localhost"), true);
    assert.equal(demoRolesAllowed("127.0.0.1"), true);
    assert.equal(
      demoRolesAllowed(
        "neurohelper-git-cursor-community-feed-pr-45bd05-samlooijenstein.vercel.app",
      ),
      true,
    );
    assert.equal(demoRolesAllowed("synlumae.com"), false);
    assert.equal(demoRolesAllowed("www.synlumae.com"), false);
    assert.equal(demoRolesAllowed("neurohelper.vercel.app"), false);
  });

  it("maps older persona ids and grants Pro only to the therapist", () => {
    assert.equal(parseDemoPersona("pro"), "therapist");
    assert.equal(parseDemoPersona("parent"), "parent");
    assert.equal(parseDemoPersona("helper"), "grandparent");
    assert.equal(parseDemoPersona("nope"), null);
    assert.equal(demoPersonaGrantsPro("therapist"), true);
    assert.equal(demoPersonaGrantsPro("parent"), false);
    assert.equal(demoPersonaGrantsPro("grandparent"), false);
  });
});
