import { useEffect, useMemo, useState } from 'react';

type Artwork = {
  id: number;
  title: string;
  artist_display?: string;
  date_display?: string;
  date_start?: number;
  image_id?: string;
};

type ArtworkApiResponse = {
  data: Artwork[];
};

type DecadeCollection = {
  label: string;
  startYear: number;
  artworks: Artwork[];
};

const API_URL = 'https://api.artic.edu/api/v1/artworks';
const ARTWORK_FIELDS = 'id,title,artist_display,date_display,date_start,image_id';
const PAGE_LIMIT = 100;
const TOTAL_PAGES = 10;

const imageUrl = (imageId?: string) =>
  imageId
    ? `https://www.artic.edu/iiif/2/${imageId}/full/843,/0/default.jpg`
    : 'https://images.artic.edu/iiif/2/8d6f8f8b-fafa-376e-4f0f-0a36d4f7288f/full/843,/0/default.jpg';

function formatArtist(artistDisplay?: string) {
  if (!artistDisplay?.trim()) {
    return 'Unknown artist';
  }

  return artistDisplay.split('\n')[0]?.trim() ?? 'Unknown artist';
}

async function fetchArtworkPage(page: number) {
  const url = new URL(API_URL);
  url.searchParams.set('fields', ARTWORK_FIELDS);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(PAGE_LIMIT));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Unable to load artwork data (HTTP ${response.status})`);
  }

  const json = (await response.json()) as ArtworkApiResponse;
  return json.data;
}

function App() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtworks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const pageNumbers = Array.from({ length: TOTAL_PAGES }, (_, index) => index + 1);
        const pages = await Promise.all(pageNumbers.map((page) => fetchArtworkPage(page)));

        const merged = pages.flat();
        const deduped = new Map<number, Artwork>();

        merged.forEach((item) => {
          if (item.id && !deduped.has(item.id)) {
            deduped.set(item.id, item);
          }
        });

        const filtered = [...deduped.values()].filter((item) => item.date_start && item.title);
        setArtworks(filtered);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error loading data');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchArtworks();
  }, []);

  const decades = useMemo<DecadeCollection[]>(() => {
    const buckets = new Map<number, Artwork[]>();

    artworks.forEach((artwork) => {
      if (typeof artwork.date_start !== 'number') {
        return;
      }

      const decadeStart = Math.floor(artwork.date_start / 10) * 10;
      const current = buckets.get(decadeStart) ?? [];
      current.push(artwork);
      buckets.set(decadeStart, current);
    });

    return [...buckets.entries()]
      .map(([startYear, items]) => ({
        label: `${startYear}s`,
        startYear,
        artworks: items.sort((a, b) => (a.date_start ?? 0) - (b.date_start ?? 0))
      }))
      .filter((collection) => collection.artworks.length >= 20)
      .sort((a, b) => a.startYear - b.startYear);
  }, [artworks]);

  useEffect(() => {
    if (decades.length === 0) {
      return;
    }

    setSelectedIndex((current) => Math.min(current, decades.length - 1));
  }, [decades]);

  const activeDecade = decades[selectedIndex];

  return (
    <main className="page-shell">
      <header className="hero">
        <p className="eyebrow">Art Institute of Chicago</p>
        <h1>Gallery Explorer</h1>
        <p className="description">
          Explore highlights from the museum collection by decade. Use the timeline slider to scrub through
          time and reveal artworks from each era.
        </p>
      </header>

      {isLoading && <p className="status">Loading gallery timeline…</p>}
      {error && <p className="status error">{error}</p>}

      {!isLoading && !error && decades.length > 0 && (
        <section className="explorer" aria-live="polite">
          <div className="timeline-panel">
            <div className="timeline-header">
              <h2>{activeDecade.label}</h2>
              <span>{activeDecade.artworks.length} works</span>
            </div>
            <input
              type="range"
              min={0}
              max={decades.length - 1}
              value={selectedIndex}
              onChange={(event) => setSelectedIndex(Number(event.target.value))}
              className="timeline-slider"
              aria-label="Timeline decade selector"
            />
            <div className="timeline-labels">
              <span>{decades[0]?.label}</span>
              <span>{decades[Math.floor(decades.length / 2)]?.label}</span>
              <span>{decades[decades.length - 1]?.label}</span>
            </div>
          </div>

          <div className="cards-grid">
            {activeDecade.artworks.slice(0, 20).map((artwork) => (
              <button
                key={artwork.id}
                type="button"
                className="art-card"
                onClick={() => setSelectedArtwork(artwork)}
                aria-label={`Open details for ${artwork.title}`}
              >
                <img src={imageUrl(artwork.image_id)} alt={artwork.title} loading="lazy" />
                <div className="card-meta">
                  <h3>{artwork.title}</h3>
                  <p>{formatArtist(artwork.artist_display)}</p>
                  <p className="muted">{artwork.date_display || artwork.date_start}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {selectedArtwork && (
        <div className="modal-backdrop" onClick={() => setSelectedArtwork(null)}>
          <section
            className="art-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Artwork details for ${selectedArtwork.title}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="close-button"
              onClick={() => setSelectedArtwork(null)}
              aria-label="Close artwork details"
            >
              ×
            </button>
            <img src={imageUrl(selectedArtwork.image_id)} alt={selectedArtwork.title} />
            <div className="modal-meta">
              <h2>{selectedArtwork.title}</h2>
              <p>{formatArtist(selectedArtwork.artist_display)}</p>
              <p className="muted">{selectedArtwork.date_display || selectedArtwork.date_start}</p>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
