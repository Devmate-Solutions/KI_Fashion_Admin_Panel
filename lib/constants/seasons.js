export const SEASON_OPTIONS = [
  { label: "Winter", value: "winter" },
  { label: "Summer", value: "summer" },
  { label: "Spring", value: "spring" },
  { label: "Autumn", value: "autumn" },
  { label: "All Season", value: "all_season" },
];

// Helper function to normalize season values (convert old capitalized format to lowercase)
export const normalizeSeasonValue = (value) => {
  if (!value) return value;
  const seasonMap = {
    "Winter": "winter",
    "Summer": "summer",
    "Spring": "spring",
    "Autumn": "autumn",
    "All Season": "all_season",
  };
  return seasonMap[value] || value.toLowerCase();
};

// Helper function to normalize season array
export const normalizeSeasonArray = (seasons) => {
  if (!Array.isArray(seasons)) {
    return seasons ? [normalizeSeasonValue(seasons)] : [];
  }
  return seasons.map(normalizeSeasonValue);
};

