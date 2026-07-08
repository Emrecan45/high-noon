export function eloTitleKey(elo) {
  if (elo >= 2000) {
    return "title.legend";
  }
  if (elo >= 1500) {
    return "title.desperado";
  }
  if (elo >= 1200) {
    return "title.marksman";
  }
  return "title.greenhorn";
}
