import { describe, it, expect } from "vitest";
import { wishAxisPercent } from "./wish-progress";
describe("wish progress alignment", () => {
  it("aligns unequal thresholds with matching nodes", () => {
    const costs = [66, 128, 188, 218, 288, 388];
    expect(wishAxisPercent(costs, 66)).toBeCloseTo(100 / 12);
    expect(wishAxisPercent(costs, 218)).toBeCloseTo(350 / 6);
    expect(wishAxisPercent(costs, 203)).toBeCloseTo(50);
  });
  it("handles empty, zero, duplicate thresholds and completion", () => {
    expect(wishAxisPercent([], 12)).toBe(0);
    expect(wishAxisPercent([66], 0)).toBe(0);
    expect(wishAxisPercent([66, 66, 128], 66)).toBe(50);
    expect(wishAxisPercent([66, 128], 128)).toBe(100);
  });
});
