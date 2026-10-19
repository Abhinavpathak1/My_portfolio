# Portfolio Admin

Open `admin.html` on the same site to access the dashboard (serve the site on localhost or HTTPS rather than opening it as a `file://` page). On first use, create one admin ID and a password of at least 10 characters. The password is stored as a salted PBKDF2 hash in this browser.

Use the dashboard sections to edit profile details, About copy, skills, certifications, projects, contact text, and footer links. List sections support adding and removing entries. Images should use filenames or paths relative to `index.html`. Save changes, then refresh the portfolio page to see them.

The **Messages** section lists contact messages submitted from this same browser and site origin. You can mark messages read/unread, reply through your email app, or delete entries. On contact-form submission, the message is saved in this browser and a `mailto:` draft is opened for `Pabhinav9001@gmail.com`; you still need to send the draft yourself. Browser-local messages are not delivered to the admin on another device or from other visitors.

## Storage and security

This is a frontend-only admin for local editing. Its login is not secure authentication: anyone who can access the deployed site can inspect or bypass frontend checks. Content changes, contact messages, and the admin account are stored in browser storage and are not shared with visitors or other devices. Do not use this for confidential information or as protection for a public deployment.

To reset the admin ID and password in this browser, remove the `abhinav-portfolio-admin-account` entry from local storage for the site. To discard local content edits and restore the built-in content, remove `abhinav-portfolio-content` from local storage.

To clear locally stored contact messages, remove `abhinav-portfolio-messages` from local storage for the site.

To publish content for everyone, update the defaults in `portfolio-data.js` and redeploy the site. Shared publishing with secure access requires server-side authentication and persistent storage.
