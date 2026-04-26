import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.mts'
					]
				},
				tsconfigRootDir: import.meta.dirname
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		rules: {
			'obsidianmd/prefer-active-doc': 'off',
			'obsidianmd/prefer-active-window': 'off',
		},
	},
	{
		files: ['**/*.ts'],
	},
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"eslint.config.mts",
		"version-bump.mjs",
		"versions.json",
		"manifest.json",
		"package.json",
		"main.js",
		".github",
		"tests",
	]),
);
