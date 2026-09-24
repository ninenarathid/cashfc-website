import { describe, expect, it } from "vitest";
import { tidyDomain } from "@/lib/domain-poll";

/**
 * What goes on the domain ballot.
 *
 * Two rows for the same name split its votes, and nobody notices until the
 * count is read out — so an address pasted from a browser has to land on the
 * same row as the name typed by hand. And the database refuses anything that
 * is not a domain; saying so before it is sent is the difference between a
 * sentence under the box and a generic failure.
 */
describe("tidyDomain", () => {
  it("reads a pasted address as the name it points at", () => {
    expect(tidyDomain("https://CashFC.com/")).toBe("cashfc.com");
    expect(tidyDomain("  http://www.cashfc.gg/members?x=1  ")).toBe("www.cashfc.gg");
    expect(tidyDomain("cashfc.com.")).toBe("cashfc.com");
    expect(tidyDomain("cashfc.com:443")).toBe("cashfc.com");
  });

  it("keeps a subdomain and a hyphen", () => {
    expect(tidyDomain("cafe-and-shabu.fc.gg")).toBe("cafe-and-shabu.fc.gg");
  });

  it("turns a Thai name into the punycode a registrar sells", () => {
    expect(tidyDomain("คาเฟ่.ไทย")).toMatch(/^xn--[a-z0-9-]+\.xn--[a-z0-9-]+$/);
  });

  it("refuses what is not a domain", () => {
    for (const bad of ["", "cashfc", "cash fc.com", "-cash.com", "cash-.com",
                       "cash..com", "cash.123", "a.b"]) {
      expect(tidyDomain(bad), bad).toBeNull();
    }
  });
});
