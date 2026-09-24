# Documentation

This directory contains documentation for maintainers and contributors of the `@0x3639/intervals-icu` library.

## Documentation site

The public documentation site (TypeDoc reference + guides) is built by `npm run docs` from the guides under [`guides/`](./guides/) plus JSDoc on the source. It is deployed by [`.github/workflows/docs.yml`](../.github/workflows/docs.yml). Every code example embedded in a guide is a typechecked file under [`examples/`](../examples/), included with `{@includeCode}` so the docs can never drift from working code.

## Available Documentation

### [Guides](./guides/)
The source for the public documentation site: getting started, authentication, errors and retries, dates/pagination/arrays, files, API behaviour, migrating to v3, and one page per service.

### [Publishing Guide](./PUBLISHING.md)
Comprehensive guide for publishing the library to NPM Registry. Includes:
- Prerequisites and setup
- Pre-publishing checklist
- Step-by-step publishing instructions
- Package configuration details
- Verification steps for both JS and TS projects
- Troubleshooting common issues
- Best practices for version management

## Package Information

- **Package Name**: `@0x3639/intervals-icu`
- **Type**: TypeScript library with dual package support (CommonJS + ES Modules)
- **Bundle Size**: ~27 KB minified (dist/index.cjs)
- **Node Version**: >=18.0.0
- **Dependencies**: Only `axios` (runtime dependency)

## Original Author

**Fernando Paladini**
- GitHub: [@paladini](https://github.com/paladini)
- NPM: [npmjs.com/~paladini](https://www.npmjs.com/~paladini)

## Key Features

The library is designed to be:
- ✅ **Lightweight**: Minimal dependencies and small bundle size
- ✅ **TypeScript-first**: Full type definitions included
- ✅ **Dual package**: Works with both CommonJS and ES Modules
- ✅ **Tree-shakeable**: ESM format allows optimal bundling
- ✅ **Developer-friendly**: Comprehensive JSDoc comments

## Quick Links

- [Main README](../README.md) - User-facing documentation
- [Publishing Guide](./PUBLISHING.md) - How to publish to NPM
- [GitHub Repository](https://github.com/0x3639/node-intervals-icu)
- [NPM Package](https://www.npmjs.com/package/@0x3639/intervals-icu)
- [Intervals.icu API Documentation](https://intervals.icu/api/v1/docs)

## Note

This documentation folder is **not included** in the published NPM package. Only the `dist/` directory is published, keeping the package lightweight. The `docs/` folder is excluded via:
1. The `files` field in `package.json` (only includes `dist/`)
2. The `.npmignore` file (explicitly excludes `docs/`)
