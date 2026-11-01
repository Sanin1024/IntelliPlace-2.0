# IntelliPlace Engineering Resource Catalog

This document catalogs the external GitHub repositories provided for use as engineering references and skills during the development of IntelliPlace. 

**Z.ai Compatibility Note:** Native installation of external CLI skills (like Claude or Cursor specific rules) is not directly supported in the current Z.ai environment. Therefore, all resources listed here are treated as **Reference Instructions** and mental models. The AI agent will consult the principles contained within these repositories contextually when implementing features.

## 1. UI/UX Design Skills and Frontend Design Systems

| Repository | Primary Purpose | Contains Agent Skill? | IntelliPlace Application |
|---|---|---|---|
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git) | UI/UX design enhancement guidelines | Yes (Claude/Z.ai format) | Reference for dashboard layouts, spacing, and enterprise SaaS polish. |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill.git) | Design taste and animation principles | Yes | Reference for micro-interactions, typography, and color theory. |
| [Leonxlnx/taste-skill-classics](https://github.com/Leonxlnx/taste-skill-classics.git) | Classic UI/UX patterns | Yes | Reference for standard component layouts (tables, forms, modals). |
| [Nutlope/hallmark](https://github.com/Nutlope/hallmark.git) | UI/UX design generation | Yes | Reference for generating high-quality frontend component structures. |
| [Motionsites-AI/claude-skill](https://github.com/Motionsites-AI/claude-skill.git) | Animation and motion design | Yes | Reference for CSS transitions, keyframes, and scroll animations. |

## 2. AI Coding-Agent Skills, Rules and Workflows

| Repository | Primary Purpose | Contains Agent Skill? | IntelliPlace Application |
|---|---|---|---|
| [vercel-labs/skills](https://github.com/vercel-labs/skills.git) | CLI for managing skills | No (CLI Tool) | Understand standard skill structures; apply underlying React/Next.js best practices. |
| [HoangNguyen0403/agent-skills-standard](https://github.com/HoangNguyen0403/agent-skills-standard.git) | Standardized agent instructions | Yes | Reference for structuring backend implementation workflows. |
| [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules.git) | Collection of `.cursorrules` | No (Cursor specific) | Extract TypeScript and Angular/React conventions. |
| [blefnk/awesome-cursor-rules](https://github.com/blefnk/awesome-cursor-rules.git) | Collection of `.cursorrules` | No (Cursor specific) | Extract general full-stack development rules. |
| [google/elephant-goldfish-model](https://github.com/google/elephant-goldfish-model.git) | Development workflow reference | No | Reference for task breakdown and feature specification workflows. |
| [daveebbelaar/bama](https://github.com/daveebbelaar/bama.git) | macOS native dev workflow | No | **Ignore** (Swift/macOS specific; not applicable to React/Node web app). |

## 3. Frontend Frameworks and Standards

| Repository | Primary Purpose | Contains Agent Skill? | IntelliPlace Application |
|---|---|---|---|
| [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss.git) | CSS Framework source | No | Reference for utility-class patterns and responsive design logic. |
| [thesysdev/openui](https://github.com/thesysdev/openui.git) | UI component library | No | Reference for accessible, reusable React component architecture. |
| [thedaviddias/Front-End-Checklist](https://github.com/thedaviddias/Front-End-Checklist.git) | Frontend QA checklist | No | Pre-deployment checklist for performance, accessibility, and SEO. |
| [dypsilon/frontend-dev-bookmarks](https://github.com/dypsilon/frontend-dev-bookmarks.git) | Frontend knowledge base | No | Reference for HTML/CSS/JS standards. |
| [bendc/frontend-guidelines](https://github.com/bendc/frontend-guidelines.git) | Frontend coding guidelines | No | Reference for clean JS and CSS authoring practices. |

## 4. Backend, System Design, and Scalability

| Repository | Primary Purpose | Contains Agent Skill? | IntelliPlace Application |
|---|---|---|---|
| [donnemartin/system-design-primer](https://github.com/donnemartin/system-design-primer.git) | System architecture reference | No | Reference for EMNS background jobs, DB scaling, and caching strategies. |
| [binhnguyennus/awesome-scalability](https://github.com/binhnguyennus/awesome-scalability.git) | Scalability patterns | No | Reference for rate limiting and connection pooling. |
| [goldbergyoni/nodebestpractices](https://github.com/goldbergyoni/nodebestpractices.git) | Node.js best practices | No | **High Priority Reference** for Express middleware, error handling, and Prisma usage. |

## 5. Cybersecurity and Application Protection

| Repository | Primary Purpose | Contains Agent Skill? | IntelliPlace Application |
|---|---|---|---|
| [swisskyrepo/PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings.git) | Security testing payloads | No | Reference for authorized penetration testing of file uploads and inputs. |
| [OWASP/CheatSheetSeries](https://github.com/OWASP/CheatSheetSeries.git) | Defensive security guides | No | **High Priority Reference** for RBAC, OTP validation, and XSS prevention. |
| [chaitin/SafeLine](https://github.com/chaitin/SafeLine.git) | Web Application Firewall (WAF) | No (Infrastructure) | Evaluate for production deployment protection; not an npm dependency. |

## 6. Complete Applications and SEO

| Repository | Primary Purpose | Contains Agent Skill? | IntelliPlace Application |
|---|---|---|---|
| [gitroomhq/postiz-app](https://github.com/gitroomhq/postiz-app.git) | Full-stack reference app | No | Study dashboard structures and notification scheduling patterns. |
| [ai-job-search-dev/ai-job-search](https://github.com/ai-job-search-dev/ai-job-search.git) | Job search reference app | No | Study job matching algorithms and profile management UI. |
| [HKUDS/DeepTutor](https://github.com/HKUDS/DeepTutor.git) | AI Tutor reference app | No | Study assessment workflows and data visualization. |
| [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo.git) | SEO guidelines | Yes | Apply only to public landing pages; protect authenticated routes from indexing. |

