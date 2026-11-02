export const eventCategories = ["Music", "Business", "Sports", "Comedy", "Food", "Workshops"] as const;

export type EventCategory = (typeof eventCategories)[number];
