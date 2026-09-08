import { describe, expect, it } from "vitest";
import { ATLAS_TOUR_JOURNEYS, getAtlasTourJourney } from "@atlas/tour";

describe("Atlas guided tours", () => {
  it("offers an overview plus detailed journeys for every internal module", () => {
    expect(ATLAS_TOUR_JOURNEYS.map((journey) => journey.id)).toEqual([
      "atlas",
      "tap",
      "maturity",
      "operating-model",
      "waf",
      "people",
      "forge",
    ]);
  });

  it("uses unique journey and step identifiers with internal routes", () => {
    const journeyIds = ATLAS_TOUR_JOURNEYS.map((journey) => journey.id);
    const stepIds = ATLAS_TOUR_JOURNEYS.flatMap((journey) => journey.steps.map((step) => step.id));

    expect(new Set(journeyIds).size).toBe(journeyIds.length);
    expect(new Set(stepIds).size).toBe(stepIds.length);

    for (const journey of ATLAS_TOUR_JOURNEYS) {
      if (journey.id === "people") {
        // Atlas introduces the module, then hands control to People & Training's
        // complete, localized onboarding instead of duplicating its steps.
        expect(journey.steps.length).toBe(2);
      } else {
        expect(journey.steps.length).toBeGreaterThanOrEqual(5);
      }
      for (const step of journey.steps) {
        expect(step.route.startsWith("/")).toBe(true);
        expect(step.title.length).toBeGreaterThan(0);
        expect(step.body.length).toBeGreaterThan(20);
      }
    }
  });

  it("resolves journeys by id", () => {
    expect(getAtlasTourJourney("forge")?.title).toContain("Forge");
    expect(getAtlasTourJourney("missing")).toBeUndefined();
  });

  it("uses the anchors from the original Operating Model document", () => {
    expect(getAtlasTourJourney("operating-model")?.steps.map((step) => step.route)).toEqual([
      "/operating-model",
      "/operating-model#modelo",
      "/operating-model#papeis",
      "/operating-model#coe",
      "/operating-model#matriz",
      "/operating-model#atlas-journey",
    ]);
  });

  it("introduces People & Training in the Atlas overview and hands off to its native guide", () => {
    const overviewPeople = getAtlasTourJourney("atlas")?.steps.find(
      (step) => step.id === "atlas-people",
    );
    expect(overviewPeople).toMatchObject({
      route: "/inference",
      target: "atlas-module-people",
      title: "People & Training",
    });

    expect(getAtlasTourJourney("people")?.title).toBe("People & Training");
    expect(getAtlasTourJourney("people")?.steps).toMatchObject([
      { route: "/inference", target: "atlas-module-people" },
      { route: "/people/?atlas_guide=1", target: null },
    ]);
  });
});
