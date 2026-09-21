import createLibheif from "./libheif/libheif.js";
const $ = (s) => document.querySelector(s),
  input = $("#files"),
  drop = $("#drop"),
  results = $("#results"),
  status = $("#status"),
  format = $("#format"),
  quality = $("#quality"),
  q = $("#q"),
  qualityRow = $("#quality-row");
quality.oninput = () => (q.textContent = quality.value + "%");
format.onchange = () => (qualityRow.hidden = format.value !== "image/jpeg");
for (const ev of ["dragenter", "dragover"])
  drop.addEventListener(ev, (e) => {
    e.preventDefault();
    drop.classList.add("drag");
  });
for (const ev of ["dragleave", "drop"])
  drop.addEventListener(ev, (e) => {
    e.preventDefault();
    drop.classList.remove("drag");
  });
drop.addEventListener("drop", (e) => convert([...e.dataTransfer.files]));
input.addEventListener("change", () => convert([...input.files]));
drop.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    input.click();
  }
});
let modulePromise;

async function getModule() {
  if (!modulePromise) {
    modulePromise = (async () => {
      const response = await fetch("./libheif/libheif.wasm");

      if (!response.ok) {
        throw new Error(`Failed to load libheif.wasm: HTTP ${response.status}`);
      }

      const wasmBinary = new Uint8Array(await response.arrayBuffer());

      return createLibheif({
        wasmBinary,
      });
    })();
  }

  return modulePromise;
}
async function convert(files) {
  files = files.filter(
    (f) => /\.(heic|heif)$/i.test(f.name) || /image\/hei[cf]/.test(f.type),
  );
  if (!files.length) {
    status.textContent = "Choose one or more HEIC/HEIF files.";
    return;
  }
  const M = await getModule();
  status.textContent = `Converting ${files.length} file(s)…`;
  for (const file of files) {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const rgba = await decodePrimary(M, bytes);
      const blob = await rgbaToBlob(
        rgba,
        format.value,
        Number(quality.value) / 100,
      );
      addResult(file, blob);
    } catch (e) {
      addError(file, e);
    }
  }
  status.textContent = "Done.";
}
async function decodePrimary(M, bytes) {
  const decoder = new M.HeifDecoder();

  const images = decoder.decode(bytes);

  if (!images || images.length === 0) {
    throw new Error("No image found in HEIC/HEIF file.");
  }

  // For normal iPhone HEIC files, use the primary/first image.
  const image = images[0];

  const width = image.get_width();
  const height = image.get_height();

  const rgba = await new Promise((resolve, reject) => {
    image.display(
      {
        data: new Uint8ClampedArray(width * height * 4),
        width,
        height,
      },
      (result) => {
        if (!result) {
          reject(new Error("libheif failed to decode the image."));
          return;
        }

        resolve(result);
      },
    );
  });

  return {
    width,
    height,
    data: rgba.data,
  };
}
async function rgbaToBlob(x, type, quality) {
  const c = document.createElement("canvas");
  c.width = x.width;
  c.height = x.height;
  const ctx = c.getContext("2d");
  ctx.putImageData(
    new ImageData(new Uint8ClampedArray(x.data), x.width, x.height),
    0,
    0,
  );
  return new Promise((resolve, reject) =>
    c.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error("Browser could not encode output")),
      type,
      quality,
    ),
  );
}
function addResult(file, blob) {
  const ext = format.value === "image/png" ? "png" : "jpg",
    url = URL.createObjectURL(blob),
    name = file.name.replace(/\.(heic|heif)$/i, "." + ext),
    d = document.createElement("article");
  d.className = "item";
  d.innerHTML =
    '<img alt="Converted preview"><div><strong></strong><div class="muted"></div></div><a class="download">Download</a>';
  d.querySelector("img").src = url;
  d.querySelector("strong").textContent = name;
  d.querySelector(".muted").textContent =
    `${pretty(file.size)} → ${pretty(blob.size)}`;
  const a = d.querySelector("a");
  a.href = url;
  a.download = name;
  results.prepend(d);
}
function addError(f, e) {
  const p = document.createElement("p");
  p.className = "error";
  p.textContent = `${f.name}: ${e?.message || e}`;
  results.prepend(p);
}
function pretty(n) {
  return n < 1048576
    ? (n / 1024).toFixed(0) + " KB"
    : (n / 1048576).toFixed(1) + " MB";
}
