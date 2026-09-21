# HEIC Local

A fast, private, browser-based **HEIC/HEIF to JPEG/PNG converter** powered by [libheif](https://github.com/strukturag/libheif) and WebAssembly.

**Live demo:** https://quyleanh.github.io/heic-local/

Images are decoded **locally in your browser**. The application does not need a conversion server and does not upload selected image files.

## Features

- HEIC / HEIF to JPEG
- HEIC / HEIF to PNG
- Batch file selection
- Drag and drop
- JPEG quality control
- Image preview
- Original and converted file-size comparison
- Runs entirely in the browser
- No backend server required
- No image upload required
- Static hosting on GitHub Pages
- Open-source libheif HEIC decoder
- WebAssembly-based decoding
- Automatic build and deployment with GitHub Actions

## How it works

HEIC decoding is performed using `libheif`, compiled to WebAssembly using Emscripten. The build includes `libde265` for HEVC decoding.

```text
HEIC / HEIF file
       |
       v
File.arrayBuffer()
       |
       v
JavaScript Uint8Array
       |
       v
libheif.js + libheif.wasm
       |
       v
libde265 HEVC decoder
       |
       v
HeifDecoder / HeifImage
       |
       v
RGBA pixel data
       |
       v
HTML Canvas
    /      \
 JPEG      PNG
    \      /
     Download
```

The generated libheif JavaScript module provides the high-level `HeifDecoder` and `HeifImage` classes used by `app.js`.

## Privacy

HEIC Local is designed so that selected images remain on the user's device.

The browser reads selected files using `File.arrayBuffer()` and passes the image data directly to the WebAssembly decoder. There is no image-upload API in this project.

The browser downloads the application itself, including:

```text
index.html
app.js
style.css
libheif.js
libheif.wasm
```

Downloading the decoder is not the same as uploading the user's image.

> If you fork this project and add analytics, external scripts, APIs, cloud storage, or upload functionality, review those changes before continuing to claim that files never leave the user's device.

## Repository structure

```text
heic-local/
├── index.html
├── app.js
├── style.css
├── README.md
├── LICENSE
├── .gitignore
└── .github/
    └── workflows/
        └── pages.yml
```

The repository does not contain the complete source for libheif, libde265, or Emscripten. They are obtained at build time by GitHub Actions.

## Build architecture

When deployment starts, GitHub Actions creates a temporary Linux runner and prepares approximately this environment:

```text
GitHub Actions runner
|
├── your repository
|   ├── index.html
|   ├── app.js
|   └── style.css
|
├── Emscripten SDK
|   ├── emcc
|   ├── em++
|   └── WebAssembly toolchain
|
└── upstream-libheif/
    ├── libheif source
    ├── headers
    ├── post.js
    ├── build-emscripten.sh
    └── libde265 build
```

After compilation, the GitHub Pages artifact contains only the files needed by the website:

```text
_site/
├── index.html
├── app.js
├── style.css
└── libheif/
    ├── libheif.js
    └── libheif.wasm
```

The temporary build environment is discarded after the workflow finishes.

# Fork and deploy your own version

## 1. Fork the repository

Click **Fork** at the top of the GitHub repository.

Alternatively:

```bash
git clone https://github.com/quyleanh/heic-local.git
cd heic-local
```

## 2. Enable GitHub Pages

Open your fork and go to:

```text
Settings -> Pages
```

Under **Build and deployment**, select:

```text
Source: GitHub Actions
```

Do not use `Deploy from a branch`, because this project first needs GitHub Actions to compile libheif to WebAssembly.

## 3. Run the workflow

The workflow is located at:

```text
.github/workflows/pages.yml
```

A push to `main` triggers it automatically. You can also open **Actions**, select the workflow, and choose **Run workflow**.

The first build can take several minutes because Emscripten, libde265, and libheif have to be prepared and compiled.

## 4. Open your site

If your GitHub username is `YOUR-USERNAME` and the repository is named `heic-local`, the URL will normally be:

```text
https://YOUR-USERNAME.github.io/heic-local/
```

For example:

```text
https://quyleanh.github.io/heic-local/
```

## What GitHub Actions does

```text
Checkout repository
       |
       v
Install Emscripten SDK
       |
       v
Clone pinned libheif release
       |
       v
Build libde265
       |
       v
Build libheif
       |
       v
Compile/link with Emscripten
       |
       v
libheif.js + libheif.wasm
       |
       v
Create _site/
       |
       v
Upload Pages artifact
       |
       v
Deploy GitHub Pages
```

## Updating libheif

Use a **pinned libheif release** instead of automatically tracking `master`.

Look in `.github/workflows/pages.yml` for a command similar to:

```bash
git clone --depth 1 --branch v1.23.4 \
  https://github.com/strukturag/libheif.git upstream-libheif
```

This means the site currently builds against libheif `v1.23.4`.

If a future release is `v1.24.0`, change:

```text
v1.23.4
```

to:

```text
v1.24.0
```

Then commit and push:

```bash
git add .github/workflows/pages.yml
git commit -m "Update libheif to v1.24.0"
git push
```

GitHub Actions will rebuild and redeploy the site automatically.

### Test after updating libheif

Do not blindly track upstream `master`. After changing the pinned release, verify:

```text
[ ] GitHub Actions succeeds
[ ] GitHub Pages deploys
[ ] libheif.js loads
[ ] libheif.wasm loads
[ ] iPhone HEIC files convert
[ ] Multiple files convert
[ ] JPEG output works
[ ] PNG output works
[ ] JPEG quality control works
[ ] Preview works
[ ] Download works
```

Ideally test files from more than one device or iOS version.

A future libheif release may change its Emscripten build process or JavaScript API. If that happens, the workflow or `app.js` may need to be updated.

## Emscripten compatibility notes

This project's workflow contains a small amount of compatibility handling for the browser build.

### Disable upstream tests

For this static browser decoder, upstream unit tests are not required. The workflow disables them using:

```text
BUILD_TESTING=OFF
```

This also avoids native thread-detection requirements that can be inappropriate for this single-threaded WebAssembly build.

### C++ final link

libheif is written in C++, so the final Emscripten link needs the C++ runtime. The workflow currently handles this using the Emscripten C++ linker setting required by the toolchain used for this build.

When upgrading libheif or Emscripten, review these compatibility adjustments because a future upstream release may no longer require them.

## Why use libde265?

HEIC images commonly store image data using HEVC/H.265. This build uses libde265 for HEVC decoding.

HEIC Local only needs:

```text
HEIC -> decode -> RGBA
```

It does not need to encode JPEG or PNG back into HEIC, so an HEIC encoder such as x265 is not required for the main use case.

JPEG and PNG output are produced by the browser after decoding:

```text
libheif
   |
   v
RGBA
   |
   v
Canvas
  /    \
JPEG   PNG
```

## Why there is no custom C++ bridge

An early version of this project experimented with a custom `src/heif_bridge.cpp` file. It is no longer required.

The upstream libheif Emscripten build already provides a JavaScript wrapper through its `post.js` file. The generated module exposes:

```text
HeifDecoder
HeifImage
```

The application can therefore use the upstream browser API directly:

```javascript
const decoder = new M.HeifDecoder();
const images = decoder.decode(bytes);
const image = images[0];
```

The resulting architecture is:

```text
app.js
   |
   v
HeifDecoder / HeifImage
   |
   v
upstream post.js
   |
   v
libheif C API
   |
   v
libheif.wasm
   |
   v
libde265
```

## How external C/C++ headers are found

If you inspect C/C++ code associated with libheif or Emscripten, you may see headers such as:

```cpp
#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <libheif/heif.h>
#include <vector>
#include <cstring>
```

Those files do not all have to be stored in this repository.

The C/C++ compiler searches configured **include paths**:

- `<vector>` and `<cstring>` come from the C++ standard library/toolchain.
- `<emscripten/bind.h>` and `<emscripten/val.h>` come from the Emscripten SDK installed by GitHub Actions.
- `<libheif/heif.h>` comes from the libheif source cloned during the workflow.

Compiler options such as the following add directories to the header search path:

```text
-I/path/to/upstream-libheif/include
-I/path/to/upstream-libheif/include/libheif
-I/path/to/upstream-libheif/libheif
```

This is why an application repository does not need to contain all external headers itself.

## Why the WASM file is loaded manually

The application explicitly downloads:

```text
./libheif/libheif.wasm
```

using `fetch()` and provides it when initializing the generated libheif module:

```javascript
const response = await fetch('./libheif/libheif.wasm');
const wasmBinary = new Uint8Array(await response.arrayBuffer());

const M = await createLibheif({ wasmBinary });
```

This avoids relying on synchronous WASM loading behavior from generated JavaScript and works well with static hosting such as GitHub Pages.

## Local development

Serve the project through HTTP rather than opening `index.html` directly through `file://`.

For example:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

Note that a fresh checkout does not automatically contain the generated `libheif.js` and `libheif.wasm` files. They are normally generated during GitHub Actions. For a fully local test, build or copy the generated artifacts into:

```text
libheif/libheif.js
libheif/libheif.wasm
```

# Troubleshooting

## `libheif.wasm` returns 404

Open DevTools and check **Network**.

The browser should successfully request:

```text
./libheif/libheif.wasm
```

The deployed artifact should contain:

```text
_site/libheif/libheif.wasm
```

## `sync fetching of the wasm failed`

This project's `app.js` explicitly preloads the WASM file and supplies it as `wasmBinary` when creating the libheif module.

If you modify initialization code, keep that behavior unless your newer Emscripten build handles asynchronous WASM loading correctly for your deployment configuration.

## `HeifDecoder` is missing

Verify that `libheif.js` and `libheif.wasm` came from the same build and that the upstream `post.js` JavaScript wrapper was included.

Check the browser Console. A working module should expose objects such as:

```text
HeifDecoder
HeifImage
```

## Build fails with a Threads error

If CMake reports something similar to:

```text
Could NOT find Threads
```

confirm that the browser production build disables upstream tests with:

```text
BUILD_TESTING=OFF
```

## Build reports missing x265, AOM, JPEG, or other codecs

Not every missing optional codec is a problem.

For this project's main use case, the important requirement is HEIC decoding through an HEVC decoder such as libde265.

HEIC encoding is not required. JPEG and PNG output are produced by the browser Canvas API.

## `/favicon.ico` returns 404

A Console message such as:

```text
GET /favicon.ico 404
```

does not affect image conversion. It simply means no favicon has been provided yet.

# Security

Image parsers process untrusted binary input, so keep libheif reasonably current and monitor upstream security releases.

However, do not blindly update production to every new commit. A safer procedure is:

```text
New libheif release
       |
       v
Update pinned version
       |
       v
GitHub Actions build
       |
       v
Test representative HEIC files
       |
       v
Inspect browser Console
       |
       v
Keep or revert update
```

# Licensing

The original HEIC Local application code is provided under the license in `LICENSE`.

Third-party software retains its own licenses. Review the licenses of at least:

- libheif
- libde265
- Emscripten
- any additional codec library you choose to enable

Do not assume that all optional codec libraries supported by libheif have the same license.

# Credits

HEIC Local is built using the open-source [strukturag/libheif](https://github.com/strukturag/libheif) project and Emscripten/WebAssembly.

# Contributing

Issues and pull requests are welcome.

Useful contributions include:

- Browser compatibility improvements
- Better handling of unusual HEIF files
- Batch-conversion improvements
- Better error messages
- UI/UX improvements
- Accessibility improvements
- Performance improvements
- Automated tests
- Mobile-browser testing
- Documentation improvements

When changing the decoder or build pipeline, please verify both JPEG and PNG conversion with representative HEIC files.

## Maintainer notes

The most important project files are:

```text
app.js
```

Browser-side conversion logic.

```text
.github/workflows/pages.yml
```

Controls the pinned libheif version, Emscripten build, and GitHub Pages deployment.

```text
index.html
style.css
```

The web interface.

These are generated by CI and normally should not be edited manually:

```text
libheif.js
libheif.wasm
```

When updating libheif, change the pinned upstream release in the workflow, let GitHub Actions regenerate the artifacts, and test the resulting site before considering the upgrade complete.
