// --- API ---
const api = {
  async request(method, path, body) {
    const opts = { method, credentials: "same-origin" };
    if (body instanceof FormData) {
      opts.body = body;
    } else if (body) {
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  },

  login(password) {
    return api.request("POST", "/api/admin/login", { password });
  },

  logout() {
    return api.request("POST", "/api/admin/logout");
  },

  listPhotos() {
    return api.request("GET", "/api/admin/photos");
  },

  getPhoto(slug) {
    return api.request("GET", `/api/admin/photos/${slug}`);
  },

  uploadPhoto(formData) {
    return api.request("POST", "/api/admin/photos", formData);
  },

  updatePhoto(slug, data) {
    return api.request("PUT", `/api/admin/photos/${slug}`, data);
  },

  deletePhoto(slug) {
    return api.request("DELETE", `/api/admin/photos/${slug}`);
  },
};

// --- Toast ---
const toastQueue = [];

function showToast(message, type = "success") {
  const toast = { id: Date.now(), message, type };
  toastQueue.push(toast);
  renderToasts();
  setTimeout(() => dismissToast(toast.id), 3500);
}

function dismissToast(id) {
  const idx = toastQueue.findIndex((t) => t.id === id);
  if (idx >= 0) toastQueue.splice(idx, 1);
  renderToasts();
}

function renderToasts() {
  const container = document.getElementById("toast-container");
  container.innerHTML = toastQueue
    .map(
      (t) =>
        `<div class="toast toast-${t.type}">${escapeHtml(t.message)}</div>`,
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// --- State ---
let state = {
  loggedIn: false,
  photos: [],
  isLoading: false,
  error: null,
  filterSeries: "all",
  searchQuery: "",
};

// --- DOM Helpers ---
function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "className") e.className = v;
    else if (k === "innerHTML") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  }
  for (const child of children) {
    if (typeof child === "string") e.appendChild(document.createTextNode(child));
    else if (child) e.appendChild(child);
  }
  return e;
}

function h(tag, attrs, ...children) {
  return el(tag, attrs, ...children);
}

// --- Series helpers ---
function getSeriesList() {
  const set = new Set();
  for (const p of state.photos) {
    if (p.series) set.add(p.series);
  }
  return Array.from(set).sort();
}

// --- Login Screen ---
function renderLogin(errorMsg) {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const card = h("div", { className: "login-card" },
    h("h1", {}, "Admin Panel"),
    h("p", { className: "subtitle" }, "James Lyu Photography"),
    h("label", {}, "Password"),
    h("input", {
      type: "password",
      id: "login-password",
      placeholder: "Enter password...",
      onkeydown: (e) => { if (e.key === "Enter") doLogin(); },
    }),
    h("div", { className: "login-error" + (errorMsg ? " visible" : ""), id: "login-error" }, errorMsg || ""),
    h("button", { className: "btn btn-primary", style: "margin-top:1rem;width:100%", onclick: doLogin }, "Log in"),
  );

  const screen = h("div", { className: "login-screen" }, card);
  app.appendChild(screen);
  setTimeout(() => document.getElementById("login-password")?.focus(), 50);
}

async function doLogin() {
  const pw = document.getElementById("login-password")?.value;
  if (!pw) return;

  const errEl = document.getElementById("login-error");
  try {
    await api.login(pw);
    state.loggedIn = true;
    await loadAndShowMain();
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message;
      errEl.classList.add("visible");
    }
  }
}

// --- Main View ---
async function loadAndShowMain() {
  state.isLoading = true;
  state.error = null;
  renderMain();
  try {
    state.photos = await api.listPhotos();
    state.isLoading = false;
    renderMain();
  } catch (err) {
    state.isLoading = false;
    state.error = err.message;
    renderMain();
  }
}

function renderMain() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  app.appendChild(renderTopbar());
  app.appendChild(renderToolbar());

  if (state.isLoading) {
    app.appendChild(renderSkeleton());
  } else if (state.error) {
    app.appendChild(renderError(state.error));
  } else {
    app.appendChild(renderPhotoGrid());
  }
}

// --- Topbar ---
function renderTopbar() {
  return h("div", { className: "topbar" },
    h("div", { className: "topbar-brand" }, "James Lyu", h("span", {}, " — Admin Panel")),
    h("button", { className: "btn", onclick: handleLogout }, "Log out"),
  );
}

async function handleLogout() {
  try {
    await api.logout();
  } catch {}
  state.loggedIn = false;
  state.photos = [];
  renderLogin();
}

// --- Toolbar ---
function renderToolbar() {
  const filterSelect = h("select", {
    onchange: (e) => {
      state.filterSeries = e.target.value;
      refreshGrid();
    },
  });
  filterSelect.appendChild(h("option", { value: "all" }, "All series"));
  for (const series of getSeriesList()) {
    filterSelect.appendChild(
      h("option", { value: series, selected: series === state.filterSeries ? "selected" : undefined }, series),
    );
  }

  return h("div", { className: "toolbar" },
    h("button", { className: "btn btn-primary", onclick: showUploadModal }, "+ Upload Photo"),
    filterSelect,
    h("input", {
      className: "search-input",
      type: "text",
      placeholder: "Search...",
      oninput: (e) => {
        state.searchQuery = e.target.value.toLowerCase();
        refreshGrid();
      },
    }),
  );
}

function refreshGrid() {
  const oldGrid = document.querySelector(".photo-grid");
  const oldSkeleton = document.querySelector(".skeleton-grid");
  const oldMsg = document.querySelector(".state-message");

  if (oldGrid) {
    const newGrid = renderPhotoGrid();
    oldGrid.replaceWith(newGrid);
  }
  if (oldSkeleton || oldMsg) {
    // Full re-render if coming from loading/error/empty
    const main = oldSkeleton?.parentElement ?? oldMsg?.parentElement;
    if (main) {
      const old = oldSkeleton ?? oldMsg;
      old.replaceWith(renderPhotoGrid());
    }
  }
}

// --- Photo Grid ---
function renderPhotoGrid() {
  let filtered = state.photos;
  if (state.filterSeries !== "all") {
    filtered = filtered.filter((p) => p.series === state.filterSeries);
  }
  if (state.searchQuery) {
    filtered = filtered.filter(
      (p) =>
        p.titleEn.toLowerCase().includes(state.searchQuery) ||
        p.titleZh.toLowerCase().includes(state.searchQuery) ||
        p.slug.toLowerCase().includes(state.searchQuery),
    );
  }

  if (filtered.length === 0) {
    return h(
      "div",
      { className: "state-message" },
      state.searchQuery || state.filterSeries !== "all"
        ? "No photos match the current filter."
        : "No photos yet. Upload your first photo.",
    );
  }

  return h(
    "div",
    { className: "photo-grid" },
    ...filtered.map((photo) => renderPhotoCard(photo)),
  );
}

function renderPhotoCard(photo) {
  const seriesBadge = photo.series
    ? h("span", { className: "badge" }, photo.series)
    : null;
  const featuredBadge = photo.featured
    ? h("span", { className: "badge badge-featured" }, "Featured")
    : null;

  return h("div", { className: "photo-card", "data-slug": photo.slug },
    h("img", {
      className: "photo-card-thumb",
      src: `/api/admin/thumbnail/${photo.slug}`,
      alt: photo.titleEn,
      loading: "lazy",
    }),
    h("div", { className: "photo-card-body" },
      h("div", { className: "photo-card-title" }, photo.titleEn || photo.slug),
      h("div", { className: "photo-card-meta" },
        seriesBadge,
        featuredBadge,
        h("span", {}, photo.date || ""),
      ),
      h("div", { className: "photo-card-actions" },
        h("button", { className: "btn btn-small", onclick: () => showEditModal(photo.slug) }, "Edit"),
        h("button", { className: "btn btn-small btn-danger", onclick: () => showDeleteDialog(photo) }, "Delete"),
      ),
    ),
  );
}

// --- Skeleton ---
function renderSkeleton() {
  const cards = [];
  for (let i = 0; i < 6; i++) {
    cards.push(
      h("div", { className: "skeleton-card" },
        h("div", { className: "skeleton-thumb" }),
        h("div", { className: "skeleton-line" }),
        h("div", { className: "skeleton-line short" }),
      ),
    );
  }
  return h("div", { className: "skeleton-grid" }, ...cards);
}

// --- Error ---
function renderError(msg) {
  return h("div", { className: "state-message" },
    h("p", {}, `Failed to load photos: ${msg}`),
    h("button", { className: "btn", style: "margin-top:0.75rem", onclick: loadAndShowMain }, "Retry"),
  );
}

// --- Modal helpers ---
let currentModal = null;

function openModal(content) {
  closeModal();
  const overlay = h("div", {
    className: "modal-overlay",
    onclick: (e) => {
      if (e.target === overlay) closeModal();
    },
  }, content);
  document.body.appendChild(overlay);
  currentModal = overlay;
}

function closeModal() {
  if (currentModal) {
    currentModal.remove();
    currentModal = null;
  }
}

// --- Upload state ---
let selectedFiles = [];

function showUploadModal() {
  selectedFiles = [];
  const content = h("div", { className: "modal" },
    h("div", { className: "modal-header" },
      h("h2", {}, "Upload Photos"),
      h("button", { className: "modal-close", onclick: closeModal }, "✕"),
    ),
    h("div", { className: "modal-body" },
      buildUploadForm(),
    ),
    h("div", { className: "modal-footer" },
      h("button", { className: "btn", onclick: closeModal }, "Cancel"),
      h("button", { className: "btn btn-primary", id: "upload-submit-btn", onclick: handleUpload }, "Upload & Create"),
    ),
    h("div", { className: "upload-progress", id: "upload-progress" },
      h("div", { className: "progress-text", id: "progress-text" }, ""),
      h("div", { className: "progress-bar" },
        h("div", { className: "progress-bar-fill", id: "progress-fill", style: "width:0%" }),
      ),
      h("div", { className: "progress-error", id: "progress-error" }),
    ),
  );
  openModal(content);
  setupDragDrop();
}

function buildUploadForm() {
  return h("div", { id: "upload-form" },
    // Drag-drop zone
    h("div", { className: "upload-zone", id: "drop-zone" },
      h("p", {}, "Drop photos here or click to browse"),
      h("p", { className: "upload-hint" }, "JPG, PNG, TIFF, WebP — max 100MB each. Select multiple files for batch upload."),
      h("input", { type: "file", id: "file-input", accept: "image/jpeg,image/png,image/tiff,image/webp", multiple: "multiple" }),
    ),

    // File list
    h("div", { className: "file-list", id: "file-list", style: "display:none" },
      h("div", { className: "file-list-header" }, "Selected photos"),
    ),

    // Shared fields
    h("div", { className: "shared-fields-section" },
      h("div", { className: "section-label" }, "Shared fields — applied to all photos"),
      h("div", { className: "form-row-3" },
        h("div", { className: "form-group" },
          h("label", { className: "form-label" }, "Camera"),
          h("input", { className: "form-input", id: "field-camera", placeholder: "e.g. Sony A7IV" }),
        ),
        h("div", { className: "form-group" },
          h("label", { className: "form-label" }, "Lens"),
          h("input", { className: "form-input", id: "field-lens", placeholder: "e.g. 24-70mm f/2.8" }),
        ),
        h("div", { className: "form-group" },
          h("label", { className: "form-label" }, "Settings"),
          h("input", { className: "form-input", id: "field-settings", placeholder: "e.g. f/5.6 1/250s ISO 200" }),
        ),
      ),
      h("div", { className: "form-row-3" },
        h("div", { className: "form-group" },
          h("label", { className: "form-label" }, "Location"),
          h("input", { className: "form-input", id: "field-location", placeholder: "Location" }),
        ),
        h("div", { className: "form-group" },
          h("label", { className: "form-label" }, "Series"),
          h("input", { className: "form-input", id: "field-series", placeholder: "e.g. hong-kong-christmas", list: "upload-series-list" }),
          h("datalist", { id: "upload-series-list" },
            ...getSeriesList().map((s) => h("option", { value: s })),
          ),
        ),
        h("div", { className: "form-group" },
          h("label", { className: "form-label" }, "Date"),
          h("input", { className: "form-input", type: "date", id: "field-date" }),
        ),
      ),
      h("div", { className: "form-row-3" },
        h("div", { className: "form-group" },
          h("label", { className: "form-label" }, "Instagram URL"),
          h("input", { className: "form-input", id: "field-instagramUrl", placeholder: "https://..." }),
        ),
        h("div", { className: "form-group" },
          h("label", { className: "form-label" }, "Threads URL"),
          h("input", { className: "form-input", id: "field-threadsUrl", placeholder: "https://..." }),
        ),
        h("div", { className: "form-group" },
          h("label", { className: "form-label" }, "Xiaohongshu URL"),
          h("input", { className: "form-input", id: "field-xiaohongshuUrl", placeholder: "https://..." }),
        ),
      ),
      h("div", { className: "form-row" },
        h("div", { className: "form-group", style: "margin-bottom:0" },
          h("label", { className: "toggle-label" },
            h("input", { type: "checkbox", id: "field-featured" }),
            "Featured photos",
          ),
        ),
        h("div", { className: "form-group", style: "margin-bottom:0" },
          h("label", { className: "form-label" }, "Order"),
          h("input", { className: "form-input", type: "number", id: "field-order", value: "0" }),
        ),
      ),
    ),
    h("div", { id: "upload-form-error", className: "form-error" }),
  );
}

function setupDragDrop() {
  const zone = document.getElementById("drop-zone");
  const input = document.getElementById("file-input");
  if (!zone || !input) return;

  zone.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    if (input.files?.length) addFiles(Array.from(input.files));
  });

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragover");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length) addFiles(files);
  });
}

function filenameToTitle(filename) {
  return filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
}

function addFiles(newFiles) {
  const allowed = ["image/jpeg", "image/png", "image/tiff", "image/webp"];
  for (const f of newFiles) {
    if (!allowed.includes(f.type)) {
      showToast(`Skipped "${f.name}": unsupported type`, "error");
      continue;
    }
    if (f.size > 100 * 1024 * 1024) {
      showToast(`Skipped "${f.name}": exceeds 100MB`, "error");
      continue;
    }
    if (selectedFiles.find((sf) => sf.name === f.name && sf.size === f.size)) continue;
    const title = filenameToTitle(f.name);
    selectedFiles.push({ file: f, titleEn: title, titleZh: "" });
  }
  renderFileList();
  updateUploadButton();
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderFileList();
  updateUploadButton();
}

function renderFileList() {
  const list = document.getElementById("file-list");
  if (!list) return;

  if (selectedFiles.length === 0) {
    list.style.display = "none";
    return;
  }

  list.style.display = "block";
  // Clear existing items (keep header)
  while (list.children.length > 1) list.lastChild.remove();

  for (let i = 0; i < selectedFiles.length; i++) {
    const sf = selectedFiles[i];
    const thumbUrl = URL.createObjectURL(sf.file);
    sf._thumbUrl = thumbUrl;

    const item = h("div", { className: "file-item" },
      h("img", { className: "file-item-thumb", src: thumbUrl, alt: sf.file.name }),
      h("span", { className: "file-item-name", title: sf.file.name }, sf.file.name),
      h("input", {
        className: "file-item-input",
        placeholder: "English title",
        value: sf.titleEn,
        oninput: (e) => { selectedFiles[i].titleEn = e.target.value; },
      }),
      h("input", {
        className: "file-item-input",
        placeholder: "中文标题",
        value: sf.titleZh,
        oninput: (e) => { selectedFiles[i].titleZh = e.target.value; },
      }),
      h("button", { className: "file-item-remove", title: "Remove", onclick: () => removeFile(i) }, "✕"),
    );
    list.appendChild(item);
  }
}

function updateUploadButton() {
  const btn = document.getElementById("upload-submit-btn");
  if (!btn) return;
  const n = selectedFiles.length;
  btn.textContent = n > 0 ? `Upload ${n} photo${n > 1 ? "s" : ""}` : "Upload & Create";
  btn.disabled = n === 0;
}

function getSharedFieldValues() {
  return {
    camera: document.getElementById("field-camera")?.value ?? "",
    lens: document.getElementById("field-lens")?.value ?? "",
    settings: document.getElementById("field-settings")?.value ?? "",
    location: document.getElementById("field-location")?.value ?? "",
    series: document.getElementById("field-series")?.value ?? "",
    featured: document.getElementById("field-featured")?.checked ? "true" : "false",
    date: document.getElementById("field-date")?.value ?? "",
    order: document.getElementById("field-order")?.value ?? "0",
    instagramUrl: document.getElementById("field-instagramUrl")?.value ?? "",
    threadsUrl: document.getElementById("field-threadsUrl")?.value ?? "",
    xiaohongshuUrl: document.getElementById("field-xiaohongshuUrl")?.value ?? "",
  };
}

async function handleUpload() {
  if (selectedFiles.length === 0) {
    // Legacy single-file fallback
    showFormError("upload-form-error", "Please select at least one photo.");
    return;
  }

  // Validate at least one title per file
  for (let i = 0; i < selectedFiles.length; i++) {
    const sf = selectedFiles[i];
    if (!sf.titleEn.trim() && !sf.titleZh.trim()) {
      showFormError("upload-form-error", `Photo "${sf.file.name}" needs at least one title (English or Chinese).`);
      return;
    }
  }

  const btn = document.getElementById("upload-submit-btn");
  const progressDiv = document.getElementById("upload-progress");
  const progressText = document.getElementById("progress-text");
  const progressFill = document.getElementById("progress-fill");
  const progressError = document.getElementById("progress-error");

  btn.disabled = true;
  btn.textContent = "Uploading...";
  progressDiv.classList.add("active");
  progressError.textContent = "";

  const shared = getSharedFieldValues();
  let succeeded = 0;
  const errors = [];

  for (let i = 0; i < selectedFiles.length; i++) {
    const sf = selectedFiles[i];
    progressText.textContent = `Uploading ${i + 1} of ${selectedFiles.length}: ${sf.file.name}`;
    progressFill.style.width = `${Math.round((i / selectedFiles.length) * 100)}%`;

    const fd = new FormData();
    fd.append("image", sf.file);
    fd.append("titleEn", sf.titleEn.trim() || filenameToTitle(sf.file.name));
    fd.append("titleZh", sf.titleZh.trim() || sf.titleEn.trim());
    fd.append("camera", shared.camera);
    fd.append("lens", shared.lens);
    fd.append("settings", shared.settings);
    fd.append("location", shared.location);
    fd.append("series", shared.series);
    fd.append("featured", shared.featured);
    fd.append("date", shared.date);
    fd.append("order", shared.order);
    fd.append("instagramUrl", shared.instagramUrl);
    fd.append("threadsUrl", shared.threadsUrl);
    fd.append("xiaohongshuUrl", shared.xiaohongshuUrl);
    fd.append("descriptionEn", "");
    fd.append("descriptionZh", "");

    try {
      await api.uploadPhoto(fd);
      succeeded++;
    } catch (err) {
      errors.push(`${sf.file.name}: ${err.message}`);
    }
  }

  progressFill.style.width = "100%";
  progressText.textContent = `Done: ${succeeded} of ${selectedFiles.length} uploaded.`;

  if (errors.length) {
    progressError.textContent = errors.join("; ");
  }

  if (succeeded > 0) {
    showToast(`${succeeded} photo${succeeded > 1 ? "s" : ""} uploaded successfully!`);
  }
  if (errors.length) {
    showToast(`${errors.length} failed`, "error");
  }

  // Clean up object URLs
  for (const sf of selectedFiles) {
    if (sf._thumbUrl) URL.revokeObjectURL(sf._thumbUrl);
  }
  selectedFiles = [];

  btn.disabled = false;
  btn.textContent = "Upload & Create";

  if (succeeded > 0) {
    closeModal();
    await loadAndShowMain();
  }
}

function showFormError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

// --- Edit Modal ---
async function showEditModal(slug) {
  let photo;
  try {
    photo = await api.getPhoto(slug);
  } catch (err) {
    showToast(err.message, "error");
    return;
  }

  const content = h("div", { className: "modal" },
    h("div", { className: "modal-header" },
      h("h2", {}, "Edit Photo"),
      h("button", { className: "modal-close", onclick: closeModal }, "✕"),
    ),
    h("div", { className: "modal-body" },
      h("img", {
        className: "upload-preview",
        src: `/api/admin/thumbnail/${slug}`,
        style: "display:block;max-height:160px",
      }),
      buildEditForm(photo),
    ),
    h("div", { className: "modal-footer" },
      h("button", { className: "btn", onclick: closeModal }, "Cancel"),
      h("button", { className: "btn btn-primary", id: "edit-submit-btn", onclick: () => handleEdit(slug) }, "Save Changes"),
    ),
  );
  openModal(content);
}

function buildEditForm(photo) {
  return h("div", { id: "edit-form" },
    h("div", { className: "form-row" },
      h("div", { className: "form-group" },
        h("label", { className: "form-label" }, "English Title *"),
        h("input", { className: "form-input", id: "edit-titleEn", value: photo.en.title }),
      ),
      h("div", { className: "form-group" },
        h("label", { className: "form-label" }, "中文标题 *"),
        h("input", { className: "form-input", id: "edit-titleZh", value: photo.zhCn.title }),
      ),
    ),
    h("div", { className: "form-row" },
      h("div", { className: "form-group" },
        h("label", { className: "form-label" }, "English Description"),
        h("textarea", { className: "form-textarea", id: "edit-descriptionEn", rows: "2" }, photo.en.description),
      ),
      h("div", { className: "form-group" },
        h("label", { className: "form-label" }, "中文描述"),
        h("textarea", { className: "form-textarea", id: "edit-descriptionZh", rows: "2" }, photo.zhCn.description),
      ),
    ),
    h("div", { className: "form-row-3" },
      h("div", { className: "form-group" },
        h("label", { className: "form-label" }, "Camera"),
        h("input", { className: "form-input", id: "edit-camera", value: photo.camera ?? "" }),
      ),
      h("div", { className: "form-group" },
        h("label", { className: "form-label" }, "Lens"),
        h("input", { className: "form-input", id: "edit-lens", value: photo.lens ?? "" }),
      ),
      h("div", { className: "form-group" },
        h("label", { className: "form-label" }, "Settings"),
        h("input", { className: "form-input", id: "edit-settings", value: photo.settings ?? "" }),
      ),
    ),
    h("div", { className: "form-row-3" },
      h("div", { className: "form-group" },
        h("label", { className: "form-label" }, "Location"),
        h("input", { className: "form-input", id: "edit-location", value: photo.location ?? "" }),
      ),
      h("div", { className: "form-group" },
        h("label", { className: "form-label" }, "Series"),
        h("input", { className: "form-input", id: "edit-series", value: photo.series ?? "", list: "edit-series-list" }),
        h("datalist", { id: "edit-series-list" },
          ...getSeriesList().map((s) => h("option", { value: s })),
        ),
      ),
      h("div", { className: "form-group" },
        h("label", { className: "form-label" }, "Date"),
        h("input", { className: "form-input", type: "date", id: "edit-date", value: photo.date }),
      ),
    ),
    h("div", { className: "form-row-3" },
      h("div", { className: "form-group" },
        h("label", { className: "form-label" }, "Instagram URL"),
        h("input", { className: "form-input", id: "edit-instagramUrl", value: photo.instagramUrl ?? "", placeholder: "https://..." }),
      ),
      h("div", { className: "form-group" },
        h("label", { className: "form-label" }, "Threads URL"),
        h("input", { className: "form-input", id: "edit-threadsUrl", value: photo.threadsUrl ?? "", placeholder: "https://..." }),
      ),
      h("div", { className: "form-group" },
        h("label", { className: "form-label" }, "Xiaohongshu URL"),
        h("input", { className: "form-input", id: "edit-xiaohongshuUrl", value: photo.xiaohongshuUrl ?? "", placeholder: "https://..." }),
      ),
    ),
    h("div", { className: "form-row" },
      h("div", { className: "form-group" },
        h("label", { className: "toggle-label" },
          h("input", { type: "checkbox", id: "edit-featured", checked: photo.featured ? "checked" : undefined }),
          "Featured photo",
        ),
      ),
      h("div", { className: "form-group" },
        h("label", { className: "form-label" }, "Order"),
        h("input", { className: "form-input", type: "number", id: "edit-order", value: String(photo.order) }),
      ),
    ),
    h("div", { id: "edit-form-error", className: "form-error" }),
  );
}

async function handleEdit(slug) {
  const titleEn = document.getElementById("edit-titleEn")?.value?.trim();
  const titleZh = document.getElementById("edit-titleZh")?.value?.trim();
  if (!titleEn || !titleZh) {
    showFormError("edit-form-error", "Both English and Chinese titles are required.");
    return;
  }

  const btn = document.getElementById("edit-submit-btn");
  btn.disabled = true;
  btn.textContent = "Saving...";

  const data = {
    titleEn,
    titleZh,
    descriptionEn: document.getElementById("edit-descriptionEn")?.value ?? "",
    descriptionZh: document.getElementById("edit-descriptionZh")?.value ?? "",
    camera: document.getElementById("edit-camera")?.value ?? "",
    lens: document.getElementById("edit-lens")?.value ?? "",
    settings: document.getElementById("edit-settings")?.value ?? "",
    location: document.getElementById("edit-location")?.value ?? "",
    series: document.getElementById("edit-series")?.value ?? "",
    featured: document.getElementById("edit-featured")?.checked ?? false,
    date: document.getElementById("edit-date")?.value ?? "",
    order: parseInt(document.getElementById("edit-order")?.value ?? "0"),
    instagramUrl: document.getElementById("edit-instagramUrl")?.value ?? "",
    threadsUrl: document.getElementById("edit-threadsUrl")?.value ?? "",
    xiaohongshuUrl: document.getElementById("edit-xiaohongshuUrl")?.value ?? "",
  };

  try {
    await api.updatePhoto(slug, data);
    showToast("Photo updated!");
    closeModal();
    await loadAndShowMain();
  } catch (err) {
    showFormError("edit-form-error", err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Changes";
  }
}

// --- Delete Dialog ---
function showDeleteDialog(photo) {
  const dialog = h("div", { className: "modal-overlay", style: "align-items:center" },
    h("div", { className: "confirm-dialog" },
      h("h3", {}, `Delete "${photo.titleEn || photo.slug}"?`),
      h("p", {}, "This removes the image file and both content entries. This cannot be undone."),
      h("div", { className: "actions" },
        h("button", { className: "btn", onclick: closeModal }, "Cancel"),
        h("button", { className: "btn btn-danger", onclick: () => handleDelete(photo.slug) }, "Delete"),
      ),
    ),
  );
  // Override overlay click — don't close on outside click for confirm dialogs
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) closeModal();
  });
  document.body.appendChild(dialog);
  currentModal = dialog;
}

async function handleDelete(slug) {
  const btns = currentModal?.querySelectorAll("button");
  if (btns) btns.forEach((b) => (b.disabled = true));

  try {
    await api.deletePhoto(slug);
    showToast("Photo deleted.");
    closeModal();
    await loadAndShowMain();
  } catch (err) {
    showToast(err.message, "error");
    closeModal();
  }
}

// --- Keyboard ---
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// --- Init ---
async function init() {
  // Try to detect if already logged in by fetching photos
  try {
    const photos = await api.listPhotos();
    state.loggedIn = true;
    state.photos = photos;
    renderMain();
  } catch {
    renderLogin();
  }
}

init();
