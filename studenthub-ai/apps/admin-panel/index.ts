import '@expo/metro-runtime';
import { registerRootComponent } from 'expo';

import App from './App';

// Same registration as the other two apps: works in Expo Go, native builds,
// and the Metro web server this console is developed against.
registerRootComponent(App);