(function (root, factory) {
  const defaults = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = defaults;
  }
  if (!root) return;
  root.portfolioDefaults = defaults;
  async function readResponse(response) {
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("The server returned an invalid response. Make sure the portfolio API is deployed.");
    }
    if (!response.ok) throw new Error(result.error || "The server could not complete the request.");
    return result;
  }
  root.loadPortfolioData = async function () {
    const response = await fetch("/api/content", { headers: { Accept: "application/json" } });
    const result = await readResponse(response);
    return result.content;
  };
  root.savePortfolioData = async function (data) {
    const response = await fetch("/api/admin/content", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: data })
    });
    await readResponse(response);
  };
  root.loadPortfolioMessages = async function () {
    const response = await fetch("/api/admin/messages", {
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    });
    const result = await readResponse(response);
    return result.messages;
  };
  root.savePortfolioMessage = async function (message) {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message)
    });
    await readResponse(response);
  };
  root.updatePortfolioMessage = async function (messageId, read) {
    const response = await fetch(`/api/admin/messages/${encodeURIComponent(messageId)}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read })
    });
    await readResponse(response);
  };
  root.deletePortfolioMessage = async function (messageId) {
    const response = await fetch(`/api/admin/messages/${encodeURIComponent(messageId)}`, {
      method: "DELETE",
      credentials: "same-origin"
    });
    await readResponse(response);
  };
})(typeof window === "undefined" ? null : window, function () {
  const defaults = {
    brand: "Abhinav.dev",
    profile: {
      subtitle: "Full-Stack AI Engineer · Cybersecurity Analyst · Android Developer",
      welcome: "> Welcome to my portfolio_",
      image: "Profileimg.jpeg",
      details: [
        { label: "NAME", value: "Abhinav Pathak" },
        { label: "DOB", value: "15th September 2005" },
        { label: "PHONE", value: "+91 9302514236" },
        { label: "EMAIL", value: "pabhinav9001@gmail.com", href: "mailto:pabhinav9001@gmail.com" },
        { label: "ADDRESS", value: "NH-1/B-196 NTPC Colony Vindhyanagar" },
        {
          label: "LINKEDIN",
          value: "linkedin.com/in/Abhinav-Pathak-aa6a35233",
          href: "https://www.linkedin.com/in/Abhinav-Pathak-aa6a35233/"
        }
      ]
    },
    about: {
      subtitle: "Background, philosophy, and what drives me.",
      paragraphs: [
        "I am a full-stack AI engineer building secure, production-grade applications across web, mobile, and backend systems. My expertise includes computer vision pipelines, facial recognition systems, fraud detection architectures, and IAM solution design.",
        "I develop backend systems in Python, Android applications using Java and Kotlin, and responsive web platforms using React. I specialize in integrating machine learning models into scalable application architectures while ensuring encryption, access control, and system integrity.",
        "I focus on engineering solutions that are not only intelligent, but secure, scalable, and deployment-ready."
      ]
    },
    skills: {
      subtitle: "Technologies, tools, and languages I work with.",
      items: [
        { icon: "⚡", label: "Python · Java · C++" },
        { icon: "🌐", label: "HTML · CSS · JavaScript · React" },
        { icon: "🗄️", label: "MySQL · Firebase" },
        { icon: "🔧", label: "Git · GitHub · Android Studio · VS Code" },
        { icon: "📱", label: "Android SDK · Kotlin · Java" },
        { icon: "🔐", label: "Ethical Hacking · IAM · Cybersecurity" },
        { icon: "🤖", label: "Computer Vision · ML · Deep Learning" },
        { icon: "🗣️", label: "English · Hindi" }
      ]
    },
    certifications: {
      subtitle: "Courses and virtual internships I have completed.",
      groups: [
        {
          label: "Course Certifications",
          items: [
            {
              image: "certi1.jpeg",
              title: "Android Development",
              from: "Teachnook",
              description: "Completed a full-stack Android development certification covering core SDK, architecture patterns, and deployment-ready practices."
            },
            {
              image: "certi2.jpeg",
              title: "Generative AI",
              from: "Internshala",
              description: "Completed a beginner-to-intermediate Generative AI course covering LLMs, prompt engineering, and practical AI application development."
            },
            {
              image: "certi3.jpeg",
              title: "Ethical Hacking",
              from: "Internshala",
              description: "Completed a foundational ethical hacking course covering penetration testing, vulnerability assessment, and security best practices."
            }
          ]
        },
        {
          label: "Virtual Internships",
          items: [
            {
              image: "certi4.jpeg",
              title: "Cyber Security Analyst",
              from: "Deloitte",
              description: "Simulated real-world consulting tasks: analyzed security logs, identified suspicious activities, assessed risks, and recommended mitigation strategies aligned with business objectives."
            },
            {
              image: "certi5.jpeg",
              title: "Cybersecurity Job Simulation",
              from: "Mastercard",
              description: "Served as an analyst on Mastercard's Security Awareness Team. Identified phishing threats and implemented security training procedures for vulnerable business units."
            },
            {
              image: "certi6.jpeg",
              title: "Cybersecurity Virtual Internship",
              from: "AIG",
              description: "Performed threat analysis for the Cyber Defense Unit. Researched CISA vulnerabilities, drafted remediation guidance, and wrote a Python brute-force decryption script for ethical hacking."
            },
            {
              image: "certi7.jpeg",
              title: "Cybersecurity Virtual Internship",
              from: "Tata",
              description: "Completed an IAM-focused simulation for TCS Cybersecurity Consulting. Delivered documentation on identity governance, access control, and strategic cybersecurity alignment."
            }
          ]
        }
      ]
    },
    projects: {
      subtitle: "Production-grade systems I've engineered.",
      items: [
        {
          image: "project1.jpeg",
          title: "NewsApp",
          tag: "API · Android Studio.java",
          description: "A live news aggregator app powered by a public API, featuring category filters and real-time article fetching.",
          link: "https://github.com"
        },
        {
          image: "project2.jpeg",
          title: "Attendance Management System",
          tag: "Firebase · Android Studio.java",
          description: "Smart attendance system using facial recognition. Built with OpenCV and Android SDK — no manual input required.",
          link: "https://github.com",
          website: "maket.in/index.html",
          websiteLabel: "Open MARKIT"
        },
        {
          image: "project3.jpeg",
          title: "Malware & Fraud Detection",
          tag: "ML · Deep Learning. python",
          description: "Hybrid ML/DL system that detects malware in files and identifies fraudulent messages and phishing links with high precision.",
          link: "https://github.com"
        }
      ]
    },
    contact: {
      subtitle: "Leave a message, suggestion, or collaboration request."
    },
    footer: {
      name: "<Abhinav Pathak />",
      copy: "© 2025 · Built with React · All rights reserved",
      email: "mailto:pabhinav9001@gmail.com",
      linkedin: "https://www.linkedin.com/in/Abhinav-Pathak-aa6a35233/",
      github: "https://github.com"
    }
  };
  return defaults;
});
