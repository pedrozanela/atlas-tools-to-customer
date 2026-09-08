// Brand color tokens — single source of truth for JS/TS color values.
// Mirror these in the @theme block of app/globals.css for Tailwind utilities.
// To change the palette: update both this file and app/globals.css @theme.
export const colors = {
  canvas: "#F9F7F4",
  surface: "#FFFFFF",
  raised: "#EEEDE9",
  raisedHover: "#E0DED9",
  brand: "#FF3621",
  brandHover: "#D42F1A",
  track: "#EEEDE9",
  foreground: "#1B3139",
} as const;
