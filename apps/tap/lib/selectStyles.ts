import type { StylesConfig } from "react-select";
import { colors } from "./colors";

export const selectStyles: StylesConfig = {
  control: (base, state) => ({
    ...base,
    backgroundColor: colors.raised,
    borderColor: state.isFocused ? colors.brand : colors.raised,
    boxShadow: state.isFocused ? `0 0 0 1px ${colors.brand}` : "none",
    color: colors.foreground,
    minHeight: "38px",
    "&:hover": { borderColor: colors.brand },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.raised}`,
    zIndex: 100,
  }),
  menuList: (base) => ({ ...base, padding: 0 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? colors.brand
      : state.isFocused
        ? colors.raised
        : "transparent",
    color: state.isSelected ? colors.canvas : colors.foreground,
    cursor: "pointer",
    fontSize: "0.875rem",
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: colors.brand,
    borderRadius: "4px",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: colors.canvas,
    fontWeight: 600,
    fontSize: "0.8rem",
    maxWidth: "200px",
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: colors.canvas,
    "&:hover": { backgroundColor: colors.brandHover, color: colors.canvas },
  }),
  singleValue: (base) => ({ ...base, color: colors.foreground }),
  placeholder: (base) => ({
    ...base,
    color: `${colors.foreground}66`,
    fontSize: "0.875rem",
  }),
  input: (base) => ({ ...base, color: colors.foreground }),
  indicatorSeparator: (base) => ({ ...base, backgroundColor: colors.raised }),
  dropdownIndicator: (base) => ({
    ...base,
    color: `${colors.foreground}80`,
    "&:hover": { color: colors.foreground },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: `${colors.foreground}80`,
    "&:hover": { color: colors.foreground },
  }),
};
