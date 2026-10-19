(function () {
  const accountKey = "abhinav-portfolio-admin-account";
  const sessionKey = "abhinav-portfolio-admin-session";
  const sectionNames = {
    profile: "Profile",
    about: "About",
    skills: "Skills",
    certifications: "Certifications",
    projects: "Projects",
    contact: "Contact & footer"
  };
  const sectionDescriptions = {
    profile: "Update the profile copy, image, and contact details shown at the top of the portfolio.",
    about: "Edit the introduction and supporting copy in the About section.",
    skills: "Manage the technologies and tools listed in the Skills section.",
    certifications: "Edit course and internship entries, including their image paths.",
    projects: "Update project titles, descriptions, technology tags, images, and links.",
    contact: "Edit the Contact section introduction and the portfolio footer links and text."
  };

  const authScreen = document.getElementById("auth-screen");
  const authForm = document.getElementById("auth-form");
  const authTitle = document.getElementById("auth-title");
  const authDescription = document.getElementById("auth-description");
  const authSubmit = document.getElementById("auth-submit");
  const authMessage = document.getElementById("auth-message");
  const authConfirm = document.getElementById("auth-confirm");
  const confirmLabel = document.getElementById("confirm-label");
  const dashboard = document.getElementById("dashboard");
  const editorForm = document.getElementById("editor-form");
  let content = window.loadPortfolioData();
  let currentView = "overview";
  let adminId = "";

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
      return `<label class="editor-field${wide}"><span class="field-label">${safeLabel}</span><textarea name="${safePath}">${safeValue}</textarea></label>`;
    }
    const hint = /image/i.test(label)
      ? '<small>Use an existing image filename or a path relative to index.html.</small>'
      : "";
    return `<label class="editor-field${wide}"><span class="field-label">${safeLabel}</span><input type="text" name="${safePath}" value="${safeValue}" />${hint}</label>`;
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
      const itemLabel = `${label.replace(/s$/, "")} ${index + 1}`;
      const removeButton = `<button class="remove-item" type="button" data-remove="${escapeHtml(itemPath)}">Remove</button>`;
      const contentHtml = item && typeof item === "object"
        ? renderObject(item, itemPath)
        : renderPrimitive(item, itemPath, `${label.replace(/s$/, "")} ${index + 1}`);
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
      renderMessages();
      return;
    }

    document.getElementById("editor-title").textContent = sectionNames[view];
    document.getElementById("editor-description").textContent = sectionDescriptions[view];
    const blocks = view === "contact"
      ? `${renderObject(content.contact, "contact")}<div class="collection-heading"><h2>Footer</h2></div>${renderObject(content.footer, "footer")}`
      : view === "profile"
        ? `${renderPrimitive(content.brand, "brand", "Portfolio brand")}${renderObject(content.profile, "profile")}`
        : renderObject(content[view], view);
    editorForm.innerHTML = `<p class="editor-intro">Changes are kept locally in this browser. Image paths should point to files available beside your portfolio page.</p>${blocks}<div class="save-row"><span id="save-message" class="save-message" role="status"></span><button class="primary-button save-button" type="submit">Save changes</button></div>`;
  }

  function renderOverview() {
    const certificateCount = content.certifications.groups.reduce((total, group) => total + group.items.length, 0);
    const messages = window.loadPortfolioMessages();
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
        projects: `${content.projects.items.length} project cards`,
        contact: "Contact intro and footer links",
        messages: `${messages.length} saved messages`
      }[view];
      return `<div class="shortcut-row"><span class="shortcut-icon" aria-hidden="true">${["◉", "▤", "✳", "♧", "◫", "✉", "▤"][index]}</span><span class="shortcut-copy"><strong>${title}</strong><small>${hint}</small></span><button type="button" data-open-view="${view}" aria-label="${view === "messages" ? "View messages" : `Edit ${title}`}">${view === "messages" ? "View →" : "Edit →"}</button></div>`;
    }).join("");
  }

  function renderMessages() {
    const messages = window.loadPortfolioMessages();
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

  function encodePassword(password, salt) {
    if (!window.crypto || !window.crypto.subtle) {
      return Promise.reject(new Error("Password setup requires HTTPS or localhost with browser cryptography enabled."));
    }
    const keyMaterial = new TextEncoder().encode(password);
    return window.crypto.subtle.importKey("raw", keyMaterial, "PBKDF2", false, ["deriveBits"])
      .then(key => window.crypto.subtle.deriveBits({
        name: "PBKDF2",
        salt,
        iterations: 150000,
        hash: "SHA-256"
      }, key, 256))
      .then(bits => Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, "0")).join(""));
  }

  function createSalt() {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  }

  function hexToBytes(hex) {
    return new Uint8Array(hex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
  }

  function setSetupMode(setup) {
    authTitle.textContent = setup ? "Create your admin login" : "Welcome back";
    authDescription.textContent = setup
      ? "Set the one admin ID and password for this browser."
      : "Sign in to manage your portfolio content.";
    authSubmit.textContent = setup ? "Create admin login" : "Sign in";
    authConfirm.hidden = !setup;
    authConfirm.required = setup;
    confirmLabel.hidden = !setup;
    document.getElementById("auth-password").autocomplete = setup ? "new-password" : "current-password";
    document.getElementById("auth-id").autocomplete = setup ? "username" : "username";
  }

  function showDashboard() {
    adminId = JSON.parse(localStorage.getItem(accountKey)).username;
    document.getElementById("admin-name").textContent = adminId;
    authScreen.hidden = true;
    dashboard.hidden = false;
    renderEditor("overview");
  }

  function bindAuthentication() {
    const accountExists = Boolean(localStorage.getItem(accountKey));
    setSetupMode(!accountExists);
    if (sessionStorage.getItem(sessionKey) === "authenticated" && accountExists) {
      showDashboard();
    }
  }

  authForm.addEventListener("submit", async event => {
    event.preventDefault();
    authMessage.textContent = "";
    const username = authForm.elements.username.value.trim();
    const password = authForm.elements.password.value;
    const accountText = localStorage.getItem(accountKey);
    try {
      if (!accountText) {
        if (password !== authConfirm.value) {
          authMessage.textContent = "The passwords do not match.";
          return;
        }
        const salt = createSalt();
        const passwordHash = await encodePassword(password, hexToBytes(salt));
        localStorage.setItem(accountKey, JSON.stringify({ username, salt, passwordHash }));
      } else {
        const account = JSON.parse(accountText);
        const passwordHash = await encodePassword(password, hexToBytes(account.salt));
        if (username !== account.username || passwordHash !== account.passwordHash) {
          authMessage.textContent = "The admin ID or password is incorrect.";
          return;
        }
      }
      sessionStorage.setItem(sessionKey, "authenticated");
      showDashboard();
    } catch (error) {
      authMessage.textContent = error.message || "Unable to authenticate in this browser.";
    }
  });

  document.getElementById("side-navigation").addEventListener("click", event => {
    const button = event.target.closest("[data-view]");
    if (button) renderEditor(button.dataset.view);
  });

  document.addEventListener("click", event => {
    const messageAction = event.target.closest("[data-message-action]");
    if (messageAction) {
      const id = messageAction.dataset.messageId;
      if (messageAction.dataset.messageAction === "delete") {
        window.deletePortfolioMessage(id);
      } else if (messageAction.dataset.messageAction === "mark-read") {
        window.markPortfolioMessageRead(id);
      } else {
        window.markPortfolioMessageUnread(id);
      }
      renderMessages();
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

  editorForm.addEventListener("submit", event => {
    event.preventDefault();
    const updated = JSON.parse(JSON.stringify(content));
    new FormData(editorForm).forEach((value, path) => setAtPath(updated, path, value));
    try {
      window.savePortfolioData(updated);
      content = updated;
      renderEditor(currentView);
      const message = document.getElementById("save-message");
      if (message) message.textContent = "Changes saved in this browser.";
    } catch (error) {
      const message = document.getElementById("save-message");
      if (message) message.textContent = `Could not save changes: ${error.message}`;
    }
  });

  document.getElementById("discard-button").addEventListener("click", () => {
    content = window.loadPortfolioData();
    renderEditor(currentView);
  });

  document.getElementById("logout-button").addEventListener("click", () => {
    sessionStorage.removeItem(sessionKey);
    dashboard.hidden = true;
    authScreen.hidden = false;
    authForm.reset();
    authMessage.textContent = "";
    setSetupMode(false);
  });

  bindAuthentication();
})();
