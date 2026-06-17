// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		lib: {
			// Change the extension from .ts to .js
			entry: 'src/my-series-markers.js',
			name: 'MySeriesMarkers',
			fileName: 'my-series-markers'
		}
	}
});
