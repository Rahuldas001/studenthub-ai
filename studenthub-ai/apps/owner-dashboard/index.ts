import '@expo/metro-runtime';
import { registerRootComponent } from 'expo';

import App from './App';

// Same registration as the student app: works in Expo Go, native builds, and
// the Metro web server this dashboard is developed against.
registerRootComponent(App);
