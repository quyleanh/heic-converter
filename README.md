# HEIC Local v2

Static GitHub Pages UI intended to use a **direct libheif WebAssembly build**, with no image upload endpoint.

## Current state

The application/UI and an Embind C++ bridge are included. The workflow deliberately stops after building upstream libheif and printing its generated JS/WASM artifacts. This makes the remaining integration explicit instead of pretending a possibly release-dependent Emscripten artifact/API is stable.

Pinned upstream release in the workflow: `v1.23.4` (change intentionally when upgrading).

## Why the workflow intentionally fails

`build-emscripten.sh` is upstream-controlled and its output/API can change. The UI expects an ES module at `libheif/libheif.js` exporting a factory with `decodeHeifToRgba(Uint8Array)`. `src/heif_bridge.cpp` defines that small, stable application-facing API using libheif + Embind.

To finish the build, inspect the filenames printed by the Action, then compile/link `src/heif_bridge.cpp` together with the libheif Emscripten build and stage the resulting modularized JS and WASM as:

```
_site/libheif/libheif.js
_site/libheif/libheif.wasm
```

Recommended Emscripten link characteristics for the bridge are `--bind`, a modularized ES-module output, and an exported module factory. The exact library path/link flags should follow the artifacts produced by the pinned upstream version.

Once verified for your pinned version, replace the diagnostic/`exit 1` in `.github/workflows/pages.yml` with the tested link and copy commands. Pin action versions/SHAs for a hardened production deployment.

## GitHub Pages

1. Create a repository and push this folder to `main`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Open the first failed action, inspect the printed libheif JS/WASM artifacts, and complete the bridge link step described above.
4. Re-run the workflow. The deploy job runs only after a successful build.

## Privacy

The provided UI contains no upload/fetch code for user-selected images. Files are read using `File.arrayBuffer()` and passed to WASM locally. Review any changes, analytics, service workers, or third-party scripts before retaining that privacy claim.

## License

This starter's original code may be used under MIT (see LICENSE). libheif and codec dependencies retain their own licenses. Preserve upstream notices and review distribution obligations for the exact codecs compiled into WASM.
