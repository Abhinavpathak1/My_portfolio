(function () {
  const container = document.getElementById("project-detail");
  const status = document.getElementById("project-data-status");
  const selectedIndex = Number(new URLSearchParams(window.location.search).get("project"));

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderProject(project) {
    const screenshots = Array.isArray(project.screenshots) ? project.screenshots.filter(Boolean) : [];
    const video = project.video || "";
    container.innerHTML = `
      <section class="project-detail-hero">
        <div class="project-detail-copy">
          <p class="project-detail-eyebrow">PROJECT SHOWCASE</p>
          <p class="project-detail-tag">${escapeHtml(project.tag || "Featured project")}</p>
          <h1>${escapeHtml(project.title || "Project")}</h1>
          <p class="project-detail-description">${escapeHtml(project.description || "")}</p>
          <div class="project-detail-actions">
            ${project.link ? `<a class="project-detail-button project-detail-primary" href="${escapeHtml(project.link)}" target="_blank" rel="noopener noreferrer">View source <span aria-hidden="true">↗</span></a>` : ""}
            ${project.website ? `<a class="project-detail-button" href="${escapeHtml(project.website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(project.websiteLabel || "Open live project")} <span aria-hidden="true">↗</span></a>` : ""}
          </div>
        </div>
        ${project.image ? `<img class="project-detail-cover" src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)} project preview" />` : ""}
      </section>
      ${video ? `
        <section class="project-detail-section" aria-labelledby="project-video-heading">
          <div class="project-detail-section-heading"><p class="project-detail-eyebrow">WALKTHROUGH</p><h2 id="project-video-heading">Project video</h2></div>
          <div class="project-video-frame"><video controls playsinline preload="metadata" src="${escapeHtml(video)}">Your browser does not support embedded video.</video></div>
        </section>` : ""}
      <section class="project-detail-section" aria-labelledby="project-gallery-heading">
        <div class="project-detail-section-heading"><p class="project-detail-eyebrow">IN THE PRODUCT</p><h2 id="project-gallery-heading">Screenshots</h2><p>Explore the interface and key moments from the project.</p></div>
        ${screenshots.length ? `<div class="project-screenshot-grid">${screenshots.map((image, index) => `<figure><img src="${escapeHtml(image)}" alt="${escapeHtml(project.title)} screenshot ${index + 1}" loading="lazy" /><figcaption>Screen ${index + 1}</figcaption></figure>`).join("")}</div>` : `<p class="project-gallery-empty">Project screenshots will be added soon.</p>`}
      </section>`;
  }

  window.loadPortfolioData().then(portfolio => {
    const project = Number.isInteger(selectedIndex) && selectedIndex >= 0
      ? portfolio.projects.items[selectedIndex]
      : null;
    if (!project) {
      container.innerHTML = '<section class="project-not-found"><p class="project-detail-eyebrow">PROJECT NOT FOUND</p><h1>This project is unavailable.</h1><a class="project-detail-button project-detail-primary" href="index.html#section-projects">Browse all projects</a></section>';
      return;
    }
    renderProject(project);
    document.title = `${project.title || "Project"} — Abhinav Pathak`;
  }).catch(error => {
    console.error("Unable to load project details:", error);
    status.textContent = "Project details could not be loaded right now. Please refresh the page.";
    status.hidden = false;
  });
})();
