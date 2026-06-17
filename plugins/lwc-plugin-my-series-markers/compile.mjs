import { dirname, resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { build, defineConfig } from 'vite';
import { fileURLToPath } from 'url';

function buildPackageJson(packageName) {
	return {
		name: packageName,
		version: '1.0.0',
		keywords: ['lwc-plugin', 'lightweight-charts'],
		type: 'module',
		main: `./${packageName}.umd.cjs`,
		module: `./${packageName}.js`,
		// Removed types fields since we are now compiling plain JavaScript
		exports: {
			import: {
				default: `./${packageName}.js`,
			},
			require: {
				default: `./${packageName}.umd.cjs`,
			},
		},
	};
}

const __filename = fileURLToPath(import.meta.url);
const currentDir = dirname(__filename);

const pluginFileName = 'my-series-markers';
// FIXED: Changed extension from .ts to .js to point to your new file location
const pluginFile = resolve(currentDir, 'src', `${pluginFileName}.js`);

const pluginsToBuild = [
	{
		filepath: pluginFile,
		exportName: 'lwc-plugin-my-series-markers',
		name: 'MySeriesMarkers',
	},
];

const compiledFolder = resolve(currentDir, 'dist');
if (!existsSync(compiledFolder)) {
	mkdirSync(compiledFolder);
}

const buildConfig = ({
	filepath,
	name,
	exportName,
	formats = ['es', 'umd'],
}) => {
	return defineConfig({
		publicDir: false,
		build: {
			outDir: `dist`,
			emptyOutDir: true,
			copyPublicDir: false,
			minify: false, // 👈 ADD THIS LINE to prevent renaming variables
			lib: {
				entry: filepath,
				name,
				formats,
				fileName: exportName,
			},
			rollupOptions: {
				external: ['lightweight-charts', 'fancy-canvas'],
				output: {
					globals: {
						'lightweight-charts': 'LightweightCharts',
					},
				},
			},
		},
	});
};


const startTime = Date.now().valueOf();
console.log('⚡️ Starting');
console.log('Bundling the plugin...');
const promises = pluginsToBuild.map(file => {
	return build(buildConfig(file));
});
await Promise.all(promises);

console.log('Generating the package.json file...');
pluginsToBuild.forEach(file => {
	const packagePath = resolve(compiledFolder, 'package.json');
	const content = JSON.stringify(
		buildPackageJson(file.exportName),
		undefined,
		4
	);
	writeFileSync(packagePath, content, { encoding: 'utf-8' });
});

// REMOVED: The code for generating typings files has been deleted 
// because dts-bundle-generator fails on pure JavaScript projects.

const endTime = Date.now().valueOf();
console.log(`🎉 Done (${endTime - startTime}ms)`);
