// Reference selectors stay below the configured Data API maximum and currently cover the verified dataset.
// Replace them with pagination before any domain can exceed this threshold.
export const REFERENCE_ENTITY_LIMIT = 1_000;

// Workbench feeds are intentionally bounded UI summaries, not complete exports.
export const HOME_ACTIVITY_FEED_LIMIT = 200;
export const OPERATIONAL_ACTIVITY_FEED_LIMIT = 300;
