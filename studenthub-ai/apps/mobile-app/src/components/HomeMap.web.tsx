import { useMemo } from 'react';
import { mapDocument, type MapProps } from './mapDocument';

export default function HomeMap({ places }: MapProps) {
  const html = useMemo(() => mapDocument(places), [places]);
  return <iframe title="Campus places map" srcDoc={html} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
    style={{ width: '100%', height: 290, border: 0, borderRadius: 20 }} />;
}