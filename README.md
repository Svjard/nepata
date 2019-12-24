# Nepata

[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Travis](https://img.shields.io/travis/Svjard/nepata.svg)](https://travis-ci.org/Svjard/nepata)
[![Coveralls](https://img.shields.io/coveralls/Svjard/nepata.svg)](https://coveralls.io/github/Svjard/nepata)
[![Dependencies](https://david-dm.org/Svjard/nepata/status.svg)](https://david-dm.org/Svjard/nepata)
[![Dev Dependencies](https://david-dm.org/Svjard/nepata/dev-status.svg)](https://david-dm.org/Svjard/nepata?type=dev)

A rapid report framework around MongoDB allowing for the generation of materialized views in MongoDB against collections without an in-depth understanding of Mongo queries.

### Usage


#### Report Format


### Development

```bash
npm install
npm run test
```

#### NPM scripts

 - `npm run test`: Run test suite
 - `npm start`: Run `npm run build` in watch mode
 - `npm run test:watch`: Run test suite in [interactive watch mode](http://facebook.github.io/jest/docs/cli.html#watch)
 - `npm run test:prod`: Run linting and generate coverage
 - `npm run build`: Generate bundles and typings, create docs
 - `npm run lint`: Lints code
 - `npm run commit`: Commit using conventional commit style ([husky](https://github.com/typicode/husky) will tell you to use it if you haven't :wink:)
