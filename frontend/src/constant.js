// src/constant.js

// Public texture to use as a background plane. Replace with a local asset if desired.
export const TEXTURE_PATH = "https://picsum.photos/1024/1024";

// Rough mapping from characters to RPM viseme/morph target keys.
// Adjust as needed to better match your specific avatar's available morphs.
export const CORRESPONDING_VISEME = {
  A: "viseme_AA",
  B: "viseme_PP",
  C: "viseme_CH",
  D: "viseme_DD",
  E: "viseme_E",
  F: "viseme_FF" || "viseme_PP",
  G: "viseme_DD",
  H: "viseme_CH",
  I: "viseme_I",
  J: "viseme_DD",
  K: "viseme_DD",
  L: "viseme_I",
  M: "viseme_PP",
  N: "viseme_DD",
  O: "viseme_O",
  P: "viseme_PP",
  Q: "viseme_U",
  R: "viseme_RR",
  S: "viseme_CH",
  T: "viseme_DD",
  U: "viseme_U",
  V: "viseme_FF" || "viseme_PP",
  W: "viseme_U",
  X: "viseme_CH",
  Y: "viseme_I",
  Z: "viseme_CH",
  " ": "viseme_sil",
};
