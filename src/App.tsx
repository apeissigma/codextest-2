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

const API_URL =
  'https://api.artic.edu/api/v1/artworks?fields=id,title,artist_display,date_display,date_start,image_id&page=1&limit=100';

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

function App() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtworks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error(`Unable to load artwork data (HTTP ${response.status})`);
        }

        const json = (await response.json()) as ArtworkApiResponse;
        const filtered = json.data.filter((item) => item.date_start && item.title);
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
      .sort(([a], [b]) => a - b)
      .map(([startYear, items]) => ({
        label: `${startYear}s`,
        startYear,
        artworks: items.sort((a, b) => (a.date_start ?? 0) - (b.date_start ?? 0))
      }));
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
            {activeDecade.artworks.slice(0, 12).map((artwork) => (
              <article key={artwork.id} className="art-card">
                <img src={imageUrl(artwork.image_id)} alt={artwork.title} loading="lazy" />
                <div className="card-meta">
                  <h3>{artwork.title}</h3>
                  <p>{formatArtist(artwork.artist_display)}</p>
                  <p className="muted">{artwork.date_display || artwork.date_start}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
