import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { mapDocument, type MapProps } from './mapDocument';

export default function HomeMap({ places, userLocation }: MapProps) {
  const source = useMemo(() => ({ html: mapDocument(places, userLocation) }), [places, userLocation]);
  return <View style={{ height: 290, borderRadius: 20, overflow: 'hidden' }}>
    <WebView source={source} originWhitelist={['*']} scrollEnabled={false}
      onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
      renderError={() => <Text>Map unavailable. Browse the place cards below.</Text>}
      style={{ flex: 1 }} />
  </View>;
}