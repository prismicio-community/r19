# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.1.8](https://github.com/prismicio-community/r19/compare/v0.1.7...v0.1.8) (2023-12-12)


### Features

* support multple procedure arguments ([#10](https://github.com/prismicio-community/r19/issues/10)) ([edce887](https://github.com/prismicio-community/r19/commit/edce88734ffa6833c4d825a298383361f1efaf75))


### Chore

* **deps:** update dependencies ([#11](https://github.com/prismicio-community/r19/issues/11)) ([af13743](https://github.com/prismicio-community/r19/commit/af13743061bd5894e9fffefaaea6fbd80d152548))

### [0.1.7](https://github.com/prismicio-community/r19/compare/v0.1.7-alpha.0...v0.1.7) (2023-03-16)


### Features

* export `R19Error` and `isR19ErrorLike` helper ([b70d57f](https://github.com/prismicio-community/r19/commit/b70d57f56624bd05c3f368ade31eb89365c1ca97))
* wrap r19-specific errors with `R19Error` ([bb88cad](https://github.com/prismicio-community/r19/commit/bb88cad070cac3ec17b7bd76b82c5bc65fa67fbc))


### Bug Fixes

* don't wrap procedure-thrown errors ([bb5e242](https://github.com/prismicio-community/r19/commit/bb5e242bae26989632ab66dcbd34d5f5d0c984c1))
* remove `isR19ErrorLike()` ([95cf7c9](https://github.com/prismicio-community/r19/commit/95cf7c99f4006b0313e63ca0b6a7c63802c22014))


### Documentation

* code style ([f1c5dfd](https://github.com/prismicio-community/r19/commit/f1c5dfdccac88386455e7dd2f778da458d952d59))

### [0.1.7-alpha.0](https://github.com/prismicio-community/r19/compare/v0.1.6...v0.1.7-alpha.0) (2023-03-15)


### Features

* add `onError` event handler ([7da6924](https://github.com/prismicio-community/r19/commit/7da6924f53c787bb5bf98af617833d030e2b380f))


### Documentation

* document `onError` event handler ([2c558db](https://github.com/prismicio-community/r19/commit/2c558dbbc17424cbdb7fbc80bce41c7296a4a7c0))
* update docs to reflect MessagePack usage ([c600aaa](https://github.com/prismicio-community/r19/commit/c600aaacda8b5be609e0b7c8ee5c0761b93e41c9))

### [0.1.6](https://github.com/prismicio-community/r19/compare/v0.1.5...v0.1.6) (2023-01-17)


### Bug Fixes

* properly close middleware using `next()` ([#7](https://github.com/prismicio-community/r19/issues/7)) ([756fe88](https://github.com/prismicio-community/r19/commit/756fe88476dd6959d3a097e2b71a9a05e9eac9f7))

### [0.1.5](https://github.com/prismicio-community/r19/compare/v0.1.4...v0.1.5) (2023-01-17)


### Bug Fixes

* declare package as side-effect-free ([fb91d2a](https://github.com/prismicio-community/r19/commit/fb91d2abc274f82c8e8fc26bfc802ba8397e1acd))


### Refactor

* remove h3 dependency ([#6](https://github.com/prismicio-community/r19/issues/6)) ([640ac7c](https://github.com/prismicio-community/r19/commit/640ac7c2b7652509205f17f9274a01e99730cbe8))

### [0.1.4](https://github.com/prismicio-community/r19/compare/v0.1.3...v0.1.4) (2023-01-13)


### Bug Fixes

* change serialization format from FormData to MessagePack ([#5](https://github.com/prismicio-community/r19/issues/5)) ([408c5cb](https://github.com/prismicio-community/r19/commit/408c5cb0ea49e52e6a9dfdd37d9f0206fc04b4dd))


### Chore

* add all exports to Size Limit config ([58141fb](https://github.com/prismicio-community/r19/commit/58141fb5816af8f77807f77d74adcfcb806699ef))

### [0.1.3](https://github.com/prismicio-community/r19/compare/v0.1.2...v0.1.3) (2023-01-04)


### Features

* add `handleRPCRequest()` ([#4](https://github.com/prismicio-community/r19/issues/4)) ([48373bf](https://github.com/prismicio-community/r19/commit/48373bff83db00f7f441b87d56d436a85c6dc632))


### Bug Fixes

* revert previous commit ([d8e95b5](https://github.com/prismicio-community/r19/commit/d8e95b5bce755843eabf0464130447e17aeb3567))


### Chore

* **deps:** update dependencies ([1eaa3c9](https://github.com/prismicio-community/r19/commit/1eaa3c9cd3c44e7faee48360f8011a2158b20cb6))

### [0.1.2](https://github.com/prismicio-community/r19/compare/v0.1.1...v0.1.2) (2022-12-17)


### Bug Fixes

* export `RPCClient` class ([c069d4e](https://github.com/prismicio-community/r19/commit/c069d4e4e2d9c31a7631368bad19b9c1678bc812))

### [0.1.1](https://github.com/prismicio-community/r19/compare/v0.1.0...v0.1.1) (2022-12-16)


### Bug Fixes

* don't bundle `formdata-node` ([3a9edb7](https://github.com/prismicio-community/r19/commit/3a9edb7275e2305026d688d186943cf5d725cba4))
* export `OmittableProcedures` ([#2](https://github.com/prismicio-community/r19/issues/2)) ([b3ea7b9](https://github.com/prismicio-community/r19/commit/b3ea7b9a473472bc2033e623b96904f1c8368131))
* expose TypeScript types for `r19/client` entry ([e69f583](https://github.com/prismicio-community/r19/commit/e69f58380c5ee92308829bc934bdad83e5b1eb62))


### Refactor

* replace `node-fetch`'s `FormData` and `Blob` with `formdata-node` ([#3](https://github.com/prismicio-community/r19/issues/3)) ([32b1a63](https://github.com/prismicio-community/r19/commit/32b1a638979d65eb004e453d4cdacd460479b757))

## 0.1.0 (2022-12-15)


### Features

* init ([aaa30b2](https://github.com/prismicio-community/r19/commit/aaa30b295e780895cd56be78aba693b0ec11f68e))


### Bug Fixes

* use published `vite-plugin-sdk` ([cf0d318](https://github.com/prismicio-community/r19/commit/cf0d318dc3deddcceb4a740af1f14104df6f3c1d))


### Documentation

* fix badges ([9d8f453](https://github.com/prismicio-community/r19/commit/9d8f4535c347c20b1776e8bffe904cf79d08282d))
* use `rpc-ts/client` entry ([9205c6d](https://github.com/prismicio-community/r19/commit/9205c6df23eb243bfc4afdca7f777694b216ad2c))


### Chore

* **release:** 0.1.0 ([e2fc8f7](https://github.com/prismicio-community/r19/commit/e2fc8f7cbe06411163806cb4371102b6ee023ea5))
* rename package to r19 ([b2ec0dd](https://github.com/prismicio-community/r19/commit/b2ec0dd2abfbb20b6620adccea383c5efa721a6d))
* sort `package.json` ([1b3b6f5](https://github.com/prismicio-community/r19/commit/1b3b6f56735ec486d360a7b279b19554e7f8dccf))
* update `package-lock.json` ([7d8085f](https://github.com/prismicio-community/r19/commit/7d8085ffd8c9a5e0b3c90f6ae5867bdc94786e95))
* use Vite 3 ([b6e54e3](https://github.com/prismicio-community/r19/commit/b6e54e388eae265cc1c166ce29513419052e6253))
