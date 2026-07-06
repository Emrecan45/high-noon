export function eloTitleKey(elo) {
  if (elo >= 1300) {
    return "title.legend";
  }
  if (elo >= 1150) {
    return "title.desperado";
  }
  if (elo >= 1050) {
    return "title.marksman";
  }
  return "title.greenhorn";
}
