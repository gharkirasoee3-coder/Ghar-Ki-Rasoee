jest.mock("../src/config/firebase.config", () => ({
  firestore: () => ({ collection: () => ({ doc: () => ({}) }) }),
}));

const MenuModel = require("../src/models/menu.model");

const config = MenuModel.normalizeMenuConfig({
  plans: {
    basic: { price: 150 },
    standard: { price: 190 },
    premium: { price: 220 },
  },
  customPricingConfig: MenuModel.defaultSubscriptionPricing,
});

describe("custom subscription pricing v2", () => {
  test.each([
    ["roti", 7, 5],
    ["sabji", 1, 50],
  ])("uses removal pricing for %s", (item, value, expected) => {
    const quote = MenuModel.quoteCustomPlan({ basePlan: "standard", selections: { [item]: value } }, config);
    expect(quote.removalTotal).toBe(expected);
  });

  test.each([["dal", 50], ["rice", 40]])("uses the configured removal price for %s", (item, expected) => {
    const configured = MenuModel.normalizeMenuConfig({
      ...config,
      plans: { ...config.plans, standard: { ...config.plans.standard, components: { ...config.plans.standard.components, [item]: 1 } } },
    });
    const quote = MenuModel.quoteCustomPlan({ basePlan: "standard", selections: { [item]: 0 } }, configured);
    expect(quote.removalTotal).toBe(expected);
  });

  test.each([
    ["roti", 9, 8],
    ["sabji", 3, 55],
    ["dal", 1, 55],
    ["rice", 1, 40],
  ])("uses addition pricing for %s", (item, value, expected) => {
    const quote = MenuModel.quoteCustomPlan({ basePlan: "standard", selections: { [item]: value } }, config);
    expect(quote.additionTotal).toBe(expected);
  });

  it("charges removal plus addition when changing a frequency", () => {
    const quote = MenuModel.quoteCustomPlan({ basePlan: "standard", selections: { raitaFrequency: "daily" } }, config);
    expect(quote.removalTotal).toBe(10);
    expect(quote.additionTotal).toBe(30);
    expect(quote.customizedSubtotal).toBe(210);
  });

  it("supports salad additions and premium-only removals", () => {
    const salad = MenuModel.quoteCustomPlan({ basePlan: "standard", selections: { saladFrequency: "threePerWeek" } }, config);
    expect(salad.additionTotal).toBe(15);
    const premium = MenuModel.quoteCustomPlan({ basePlan: "premium", selections: { sweetDishFrequency: "none", saturdaySpecial: false } }, config);
    expect(premium.removalTotal).toBe(25);
  });

  it("rejects actions without an admin-configured rate", () => {
    expect(() => MenuModel.quoteCustomPlan({ basePlan: "scratch", selections: { saturdaySpecial: true } }, config)).toThrow("saturdaySpecial pricing is not configured");
    expect(() => MenuModel.quoteCustomPlan({ basePlan: "scratch", selections: { sweetDishFrequency: "twicePerWeek" } }, config)).toThrow("sweetDish pricing is not configured");
  });

  it("uses unique valid delivery days for cent-safe proration", () => {
    const quote = MenuModel.quoteCustomPlan({ basePlan: "standard", deliveryDays: ["Monday", "monday", "wednesday", "friday"] }, config);
    expect(quote.deliveryDayFactor).toBe(0.5);
    expect(quote.customizedSubtotal).toBe(95);
    expect(() => MenuModel.quoteCustomPlan({ basePlan: "standard", deliveryDays: ["sunday"] }, config)).toThrow("invalid day");
  });

  it("uses dynamically updated admin rates immediately", () => {
    const changed = MenuModel.normalizeMenuConfig({
      ...config,
      customPricingConfig: { ...config.customPricingConfig, addition: { ...config.customPricingConfig.addition, roti: 12 } },
    });
    expect(MenuModel.quoteCustomPlan({ basePlan: "basic", selections: { roti: 5 } }, changed).additionTotal).toBe(12);
  });

  it("maps legacy custom detail fields onto canonical selections", () => {
    const quote = MenuModel.quoteCustomPlan({ basePlan: "basic", roti: 3, sabziChoices: 2, raitaOption: "daily" }, config);
    expect(quote.selectedComponents).toMatchObject({ roti: 3, sabji: 2, raitaFrequency: "daily" });
    expect(quote.removalTotal).toBe(15);
    expect(quote.additionTotal).toBe(85);
  });

  it("validates quantities and booleans", () => {
    expect(() => MenuModel.quoteCustomPlan({ basePlan: "basic", selections: { roti: 1.5 } }, config)).toThrow("whole number");
    expect(() => MenuModel.quoteCustomPlan({ basePlan: "basic", selections: { saturdaySpecial: "yes" } }, config)).toThrow("true or false");
  });
});
