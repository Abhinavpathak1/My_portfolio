(function () {
  const sectionNames = {
    profile: "Profile",
    about: "About",
    skills: "Skills",
    certifications: "Certifications",
    badges: "Badges",
    projects: "Projects",
    contact: "Contact & footer"
  };
  const sectionDescriptions = {
    profile: "Update the profile copy, image, and contact details shown at the top of the portfolio.",
    about: "Edit the introduction and supporting copy in the About section.",
    skills: "Manage the technologies and tools listed in the Skills section.",
    certifications: "Edit course and internship entries, including their image paths.",
    badges: "Add, edit, and upload images for your digital badges.",
    projects: "Manage project cards, screenshots, demo videos, descriptions, and links.",
    contact: "Edit the Contact section introduction and the portfolio footer links and text."
  };

  const authScreen = document.getElementById("auth-screen");
  const authForm = document.getElementById("auth-form");
  const authSubmit = document.getElementById("auth-submit");
  const authMessage = document.getElementById("auth-message");
  const dashboard = document.getElementById("dashboard");
  const editorForm = document.getElementById("editor-form");
  let content = window.portfolioDefaults;
  let messages = [];
  let currentView = "overview";

  function errorMessage(value, fallback) {
    if (typeof value === "string" && value.trim()) return value;
    if (value instanceof Error && value.message) return value.message;
    if (value && typeof value === "object") {
      for (const key of ["message", "error", "detail", "details"]) {
        if (value[key] !== undefined) {
          const message = errorMessage(value[key], "");
          if (message) return message;
        }
      }
      const serialized = JSON.stringify(value);
      if (serialized && serialized !== "{}") return serialized;
    }
    return fallback;
  }

  async function apiRequest(path, options = {}) {
    const response = await fetch(path, {
      credentials: "same-origin",
      ...options,
      headers: { Accept: "application/json", ...(options.headers || {}) }
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("The server returned an invalid response. Make sure the admin API is deployed.");
    }
    if (!response.ok) throw new Error(errorMessage(result.error, "The request could not be completed."));
    return result;
  }

  function showDashboardStatus(message) {
    const status = document.getElementById("dashboard-status");
    status.textContent = message || "";
    status.hidden = !message;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function captureEditorValues() {
    if (currentView === "overview") return;
    new FormData(editorForm).forEach((value, path) => setAtPath(content, path, value));
  }

  function humanize(key) {
    return key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, character => character.toUpperCase());
  }

  function isLongText(key, value) {
    return value.length > 90 || /description|paragraph|subtitle|copy|address/i.test(key);
  }

  function renderPrimitive(value, path, label) {
    const safePath = escapeHtml(path);
    const safeLabel = escapeHtml(label);
    const safeValue = escapeHtml(value);
    const wide = isLongText(label, String(value)) ? " wide" : "";
    if (Array.isArray(value)) {
      return renderArray(value, path, label);
    }
    if (value && typeof value === "object") {
      return renderObject(value, path);
    }
    if (typeof value === "string" && isLongText(label, value)) {
      return `<div class="editor-field${wide}"><label class="field-label" for="${safePath}-input">${safeLabel}</label><textarea id="${safePath}-input" name="${safePath}">${safeValue}</textarea></div>`;
    }
    const inputId = `${safePath}-input`;
    const canUploadImage = /image/i.test(label) &&
      (/^certifications\.groups/.test(path) || /^badges\.items/.test(path) || /^projects\.items/.test(path));
    const canUploadProjectScreenshot = /^projects\.items\[\d+\]\.screenshots\[\d+\]$/.test(path);
    const canUploadProjectVideo = /^projects\.items\[\d+\]\.video$/.test(path);
    const hint = canUploadImage
      ? `<div class="image-upload-control"><label class="image-upload-button">Upload image<input type="file" accept="image/jpeg,image/png,image/webp" data-upload-for="${safePath}" data-media-kind="image" /></label><small data-upload-status-for="${safePath}">JPG, PNG, or WebP. The image is resized before upload.</small></div>`
      : canUploadProjectScreenshot
        ? `<div class="image-upload-control"><label class="image-upload-button">Upload screenshot<input type="file" accept="image/jpeg,image/png,image/webp" data-upload-for="${safePath}" data-media-kind="image" /></label><small data-upload-status-for="${safePath}">Images are resized before upload.</small></div>`
        : canUploadProjectVideo
          ? `<div class="image-upload-control"><label class="image-upload-button">Upload demo video<input type="file" accept="video/mp4,video/webm" data-upload-for="${safePath}" data-media-kind="video" /></label><small data-upload-status-for="${safePath}">MP4 or WebM, up to 3 MB. One video per project.</small></div>`
      : /image/i.test(label)
        ? '<small>Use an existing image filename or a path relative to index.html.</small>'
        : "";
    return `<div class="editor-field${wide}"><label class="field-label" for="${escapeHtml(inputId)}">${safeLabel}</label><input id="${escapeHtml(inputId)}" type="text" name="${safePath}" value="${safeValue}" />${hint}</div>`;
  }

  function renderObject(value, path) {
    return `<div class="editor-fields">${Object.keys(value).map(key =>
      renderPrimitive(value[key], `${path}.${key}`, humanize(key))
    ).join("")}</div>`;
  }

  function renderArray(value, path, label) {
    const safePath = escapeHtml(path);
    const safeLabel = escapeHtml(label);
    const entries = value.map((item, index) => {
      const itemPath = `${path}[${index}]`;
      const itemLabel = /^projects\.items\[\d+\]\.screenshots$/.test(path)
        ? `Screenshot ${index + 1}`
        : `${label.replace(/s$/, "")} ${index + 1}`;
      const removeButton = `<button class="remove-item" type="button" data-remove="${escapeHtml(itemPath)}">Remove</button>`;
      const contentHtml = item && typeof item === "object"
        ? renderObject(item, itemPath)
        : renderPrimitive(item, itemPath, itemLabel);
      return `<article class="editor-item"><div class="editor-item-header"><span>${escapeHtml(itemLabel)}</span>${removeButton}</div>${contentHtml}</article>`;
    }).join("");
    return `<section class="editor-collection"><div class="collection-heading"><h2>${safeLabel}</h2><button type="button" data-add="${safePath}">+ Add ${escapeHtml(label.replace(/s$/, ""))}</button></div><div class="collection-list">${entries || '<p class="editor-intro">No entries yet. Add one to get started.</p>'}</div></section>`;
  }

  function tokenizePath(path) {
    return path.match(/[^.[\]]+/g) || [];
  }

  function getAtPath(root, path) {
    return tokenizePath(path).reduce((value, key) => value[key], root);
  }

  function setAtPath(root, path, value) {
    const tokens = tokenizePath(path);
    let target = root;
    for (let index = 0; index < tokens.length - 1; index += 1) {
      target = target[tokens[index]];
    }
    target[tokens[tokens.length - 1]] = value;
  }

  function parentArrayPath(itemPath) {
    return itemPath.replace(/\[\d+\]$/, "");
  }

  function renderEditor(view) {
    currentView = view;
    document.getElementById("overview-view").hidden = view !== "overview";
    document.getElementById("editor-view").hidden = view === "overview" || view === "messages";
    document.getElementById("messages-view").hidden = view !== "messages";
    document.getElementById("topbar-title").textContent = view === "overview" ? "Overview" : view === "messages" ? "Messages" : sectionNames[view];
    document.querySelectorAll(".side-link").forEach(button => {
      button.classList.toggle("active", button.dataset.view === view);
    });
    if (view === "overview") {
      renderOverview();
      return;
    }
    if (view === "messages") {
      refreshMessages().catch(error => showDashboardStatus(`Could not load messages: ${error.message}`));
      return;
    }

    document.getElementById("editor-title").textContent = sectionNames[view];
    document.getElementById("editor-description").textContent = sectionDescriptions[view];
    const blocks = view === "contact"
      ? `${renderObject(content.contact, "contact")}<div class="collection-heading"><h2>Footer</h2></div>${renderObject(content.footer, "footer")}`
      : view === "profile"
        ? `${renderPrimitive(content.brand, "brand", "Portfolio brand")}${renderObject(content.profile, "profile")}`
        : renderObject(content[view], view);
    const intro = view === "certifications" || view === "badges"
      ? "Upload a JPG, PNG, or WebP image for a certificate or badge. Uploaded images are stored in Postgres; save changes to publish them."
      : view === "projects"
        ? "Add as many project screenshots as needed and upload one MP4 or WebM demo video per project. Save changes to publish uploaded media."
      : "Changes are saved to the shared portfolio database. Image paths should point to files available beside your portfolio page.";
    editorForm.innerHTML = `<p class="editor-intro">${intro}</p>${blocks}<div class="save-row"><span id="save-message" class="save-message" role="status"></span><button class="primary-button save-button" type="submit">Save changes</button></div>`;
  }

  function renderOverview() {
    const certificateCount = content.certifications.groups.reduce((total, group) => total + group.items.length, 0);
    const unreadCount = messages.filter(message => !message.read).length;
    const navCount = document.getElementById("messages-nav-count");
    navCount.hidden = unreadCount === 0;
    navCount.textContent = unreadCount;
    const stats = [
      { label: "Projects", count: content.projects.items.length, icon: "◫", color: "blue" },
      { label: "Certificates", count: certificateCount, icon: "♧", color: "green" },
      { label: "Skills", count: content.skills.items.length, icon: "✳", color: "violet" },
      { label: "Unread messages", count: unreadCount, icon: "✉", color: "amber" }
    ];
    document.getElementById("overview-stats").innerHTML = stats.map(stat =>
      `<article class="stat-card"><span class="stat-icon ${stat.color}" aria-hidden="true">${stat.icon}</span><span><small>${stat.label}</small><strong>${stat.count}</strong></span></article>`
    ).join("");

    const shortcuts = [...Object.keys(sectionNames).map(key => [key, sectionNames[key]]), ["messages", "Messages"]];
    document.getElementById("section-shortcuts").innerHTML = shortcuts.map((key, index) => {
      const view = key[0];
      const title = key[1];
      const hint = {
        profile: "Profile details and image",
        about: `${content.about.paragraphs.length} introduction paragraphs`,
        skills: `${content.skills.items.length} skill entries`,
        certifications: `${certificateCount} course and internship entries`,
        badges: `${content.badges.items.filter(badge => badge.title || badge.image).length} digital badges`,
        projects: `${content.projects.items.length} project cards`,
        contact: "Contact intro and footer links",
        messages: `${messages.length} saved messages`
      }[view];
      const icons = { profile: "◉", about: "▤", skills: "✳", certifications: "♧", badges: "✦", projects: "◫", contact: "✉", messages: "▤" };
      return `<div class="shortcut-row"><span class="shortcut-icon" aria-hidden="true">${icons[view]}</span><span class="shortcut-copy"><strong>${title}</strong><small>${hint}</small></span><button type="button" data-open-view="${view}" aria-label="${view === "messages" ? "View messages" : `Edit ${title}`}">${view === "messages" ? "View →" : "Edit →"}</button></div>`;
    }).join("");
  }

  function renderMessages() {
    const list = document.getElementById("messages-list");
    const empty = document.getElementById("messages-empty");
    const navCount = document.getElementById("messages-nav-count");
    const unreadCount = messages.filter(message => !message.read).length;
    navCount.hidden = unreadCount === 0;
    navCount.textContent = unreadCount;
    empty.hidden = messages.length > 0;
    list.innerHTML = messages.map(message => {
      const date = new Date(message.createdAt);
      const dateLabel = Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
      const email = escapeHtml(message.email);
      const messageBody = escapeHtml(message.message).replace(/\r?\n/g, "<br>");
      const replySubject = encodeURIComponent("Re: Portfolio contact message");
      const replyBody = encodeURIComponent(`\n\nOriginal message:\n${message.message}`);
      return `<article class="panel message-card${message.read ? "" : " unread"}">
        <div class="message-heading">
          <div class="message-sender"><span class="message-avatar" aria-hidden="true">✉</span><div><a href="mailto:${email}">${email}</a><small>${escapeHtml(dateLabel)}</small></div></div>
          <span class="message-status">${message.read ? "Read" : "Unread"}</span>
        </div>
        <p class="message-body">${messageBody}</p>
        <div class="message-actions">
          <a class="secondary-button" href="mailto:${email}?subject=${replySubject}&body=${replyBody}">Reply by email ↗</a>
          <button class="secondary-button" type="button" data-message-action="${message.read ? "mark-unread" : "mark-read"}" data-message-id="${escapeHtml(message.id)}">${message.read ? "Mark unread" : "Mark read"}</button>
          <button class="secondary-button danger-button" type="button" data-message-action="delete" data-message-id="${escapeHtml(message.id)}">Delete</button>
        </div>
      </article>`;
    }).join("");
  }

  async function refreshMessages() {
    messages = await window.loadPortfolioMessages();
    renderMessages();
  }

  async function showDashboard(email) {
    document.getElementById("admin-name").textContent = email;
    authScreen.hidden = true;
    dashboard.hidden = false;
    showDashboardStatus("");
    try {
      content = await window.loadPortfolioData();
    } catch (error) {
      dashboard.hidden = true;
      authScreen.hidden = false;
      authMessage.textContent = `Could not load saved portfolio content: ${error.message}`;
      return;
    }
    try {
      messages = await window.loadPortfolioMessages();
    } catch (error) {
      messages = [];
      showDashboardStatus(`Could not load contact messages: ${error.message}`);
    }
    renderEditor("overview");
  }

  async function bindAuthentication() {
    try {
      const session = await apiRequest("/api/auth/session");
      if (session.authenticated) await showDashboard(session.email);
    } catch (error) {
      authMessage.textContent = `Unable to check admin sign-in: ${errorMessage(error, "The request could not be completed.")}`;
    }
  }

  authForm.addEventListener("submit", async event => {
    event.preventDefault();
    authMessage.textContent = "";
    const username = authForm.elements.username.value.trim();
    const password = authForm.elements.password.value;
    authSubmit.disabled = true;
    try {
      const session = await apiRequest("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      authForm.reset();
      await showDashboard(session.email);
    } catch (error) {
      authMessage.textContent = errorMessage(error, "Unable to sign in.");
    } finally {
      authSubmit.disabled = false;
    }
  });

  editorForm.addEventListener("change", async event => {
    const fileInput = event.target.closest("input[type='file'][data-upload-for]");
    if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
    const file = fileInput.files[0];
    const path = fileInput.dataset.uploadFor;
    const kind = fileInput.dataset.mediaKind || "image";
    const status = Array.from(editorForm.querySelectorAll("[data-upload-status-for]"))
      .find(element => element.dataset.uploadStatusFor === path);
    const saveButton = editorForm.querySelector(".save-button");
    captureEditorValues();
    fileInput.disabled = true;
    if (saveButton) saveButton.disabled = true;
    if (status) status.textContent = kind === "image" ? "Preparing image…" : "Preparing video…";
    try {
      const media = kind === "image" ? await prepareImage(file) : file;
      if (kind === "video" && !["video/mp4", "video/webm"].includes(file.type)) {
        throw new Error("Choose an MP4 or WebM video.");
      }
      if (kind === "video" && file.size > 3 * 1024 * 1024) {
        throw new Error("Choose a video no larger than 3 MB.");
      }
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("The selected media could not be read."));
        reader.readAsDataURL(media);
      });
      const result = await apiRequest("/api/media/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: base64, kind })
      });
      const imageField = Array.from(editorForm.elements).find(element => element.name === path);
      if (!imageField) throw new Error("The image field is no longer available.");
      imageField.value = result.url;
      setAtPath(content, path, result.url);
      if (status) status.textContent = `Uploaded ${file.name}. Save changes to publish.`;
    } catch (error) {
      if (status) status.textContent = `Upload failed: ${errorMessage(error, "The image could not be uploaded.")}`;
    } finally {
      fileInput.value = "";
      fileInput.disabled = false;
      if (saveButton) saveButton.disabled = false;
    }
  });

  document.getElementById("side-navigation").addEventListener("click", event => {
    const button = event.target.closest("[data-view]");
    if (button) renderEditor(button.dataset.view);
  });

  document.addEventListener("click", async event => {
    const messageAction = event.target.closest("[data-message-action]");
    if (messageAction) {
      const id = messageAction.dataset.messageId;
      messageAction.disabled = true;
      try {
        if (messageAction.dataset.messageAction === "delete") {
          await window.deletePortfolioMessage(id);
        } else {
          await window.updatePortfolioMessage(id, messageAction.dataset.messageAction === "mark-read");
        }
        await refreshMessages();
        showDashboardStatus("");
      } catch (error) {
        showDashboardStatus(`Could not update message: ${error.message}`);
        messageAction.disabled = false;
      }
      return;
    }
    const openButton = event.target.closest("[data-open-view]");
    if (openButton) {
      renderEditor(openButton.dataset.openView);
      return;
    }
    const addButton = event.target.closest("[data-add]");
    if (addButton) {
      captureEditorValues();
      const path = addButton.dataset.add;
      const list = getAtPath(content, path);
      const defaultList = getAtPath(window.portfolioDefaults, path);
      const template = list[0] !== undefined ? list[0] : defaultList[0];
      list.push(template && typeof template === "object" ? JSON.parse(JSON.stringify(template)) : "");
      renderEditor(currentView);
      return;
    }
    const removeButton = event.target.closest("[data-remove]");
    if (removeButton) {
      captureEditorValues();
      const path = removeButton.dataset.remove;
      const array = getAtPath(content, parentArrayPath(path));
      const index = Number(path.match(/\[(\d+)\]$/)[1]);
      array.splice(index, 1);
      renderEditor(currentView);
    }
  });

  editorForm.addEventListener("submit", async event => {
    event.preventDefault();
    const updated = JSON.parse(JSON.stringify(content));
    new FormData(editorForm).forEach((value, path) => setAtPath(updated, path, value));
    const saveButton = editorForm.querySelector(".save-button");
    saveButton.disabled = true;
    try {
      await window.savePortfolioData(updated);
      content = updated;
      renderEditor(currentView);
      const message = document.getElementById("save-message");
      if (message) message.textContent = "Changes saved and published.";
    } catch (error) {
      const message = document.getElementById("save-message");
      if (message) message.textContent = `Could not save changes: ${error.message}`;
      saveButton.disabled = false;
    }
  });

  document.getElementById("discard-button").addEventListener("click", async () => {
    try {
      content = await window.loadPortfolioData();
      renderEditor(currentView);
      showDashboardStatus("");
    } catch (error) {
      showDashboardStatus(`Could not reload saved content: ${error.message}`);
    }
  });

  document.getElementById("logout-button").addEventListener("click", async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
      dashboard.hidden = true;
      authScreen.hidden = false;
      authForm.reset();
      authMessage.textContent = "";
      showDashboardStatus("");
    } catch (error) {
      showDashboardStatus(`Unable to sign out: ${errorMessage(error, "The request could not be completed.")}`);
    } finally {
      button.disabled = false;
    }
  });

  bindAuthentication();

  async function prepareImage(file) {
    const maximumInputBytes = 20 * 1024 * 1024;
    const maximumOutputBytes = 800 * 1024;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error("Choose a JPG, PNG, or WebP image.");
    }
    if (file.size > maximumInputBytes) {
      throw new Error("Choose an image smaller than 20 MB.");
    }
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 40000000) {
        throw new Error("The image dimensions are too large to process.");
      }
      let scale = Math.min(1, 2200 / bitmap.width, 2200 / bitmap.height);
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Image processing is unavailable in this browser.");
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const image = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.82));
        if (!image) throw new Error("The selected image could not be converted.");
        if (image.size <= maximumOutputBytes) return image;
        scale *= 0.78;
      }
      throw new Error("The image is too large after compression. Choose a smaller image.");
    } finally {
      if (bitmap) bitmap.close();
    }
  }
})();
