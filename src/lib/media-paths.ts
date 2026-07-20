const artistFileExceptions: Record<string, string> = {
  aociz: "aociz.jpeg",
  "chicho-cortez": "chichocortez.jpg",
  "cory-tate": "corytate.jpg",
  "forever-pavot": "emile-sornin-forever-pavot.jpg",
  "jean-pierre-menager": "jean-pierre-menager.jpeg",
  "laurent-dury": "laurent-dury.jpeg",
  "mr-viktor": "mrviktor.jpg",
  "n-zeng": "sebastienblanchon.jpg",
  "of-ivory-horn": "of-ivory-horn.webp",
  "rebecca-meyer": "rebecca-meyer.jpeg",
  "sebastien-blanchon": "sebastien-blanchon.jpeg",
  "stan-galouo-palma-coco-records": "stan-galouo-palma-coco-reccords.jpeg",
  "well-quartet": "well-quartet.jpeg",
};

export function publicArtistImage(path: string | null | undefined, slug?: string): string | null {
  if (!path) {
    if (!slug) return null;
    return `/media/mock/artists/${artistFileExceptions[slug] ?? `${slug}.jpg`}`;
  }
  if (path.startsWith("/media/mock/artists/")) return path;

  const fileName = path.split("/").pop();
  return fileName ? `/media/mock/artists/${fileName}` : null;
}
