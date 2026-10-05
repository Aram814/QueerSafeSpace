/** The link people send to each other: it shows a preview card, then opens the place in the app. */
export function placeShareUrl(id: string): string {
  return `${window.location.origin}/p/${id}`;
}

/** The place id in an address like /?place=<id>, or null. */
export function placeFromAddress(): string | null {
  const id = new URLSearchParams(window.location.search).get('place');
  return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
}
