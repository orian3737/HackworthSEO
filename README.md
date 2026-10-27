# hackworthseo.com

The single-page marketing site for **Hackworth.exe, LLC**, a boutique SEO firm in Connecticut. It is plain static HTML, CSS and a little vanilla JavaScript: no framework, no build step, no npm dependencies, and no third-party scripts. It is hosted on Netlify.

## File structure

```
index.html                 Home page (all sections)
thank-you/index.html       Shown after the inquiry form is submitted (noindex)
404.html                   Not-found page (Netlify serves it automatically)
assets/css/site.css        All styles, including self-hosted @font-face rules
assets/js/site.js          Footer year, reveal-on-scroll, mobile menu
assets/fonts/              Libre Caslon Display 400; Libre Caslon Text 400, 400 italic, 700 (woff2)
assets/img/favicon.svg
assets/img/og-image.png    1200×630 social sharing image
robots.txt
sitemap.xml                Update <lastmod> when the page content changes
netlify.toml               Publish settings, security headers, asset caching, www → apex redirect
```

## Run locally

From the repository root, run either of these:

```
python -m http.server 8000      # then open http://localhost:8000
npx serve .
```

Use a local server rather than opening the file directly, because asset paths are root-relative (`/assets/...`).

## Deploy

1. In Netlify, choose **Add new site → Import an existing project** and connect this repository.
2. Leave the build command empty and set the publish directory to `.` (`netlify.toml` already sets this).
3. Under **Domain management**, add `hackworthseo.com` and `www.hackworthseo.com`. Point DNS as Netlify instructs, then enable HTTPS (Let's Encrypt). `www` redirects permanently to the apex domain.

## Inquiry form notifications

The form uses Netlify Forms (`name="inquiry"`, with a `company_website` honeypot) and redirects to `/thank-you/`. Netlify detects it on deploy.

- **Email notifications:** in the Netlify dashboard go to **Site configuration → Forms → Form notifications → Add notification → Email**, then enter the address that should receive inquiries.
- **Submissions** also appear under the site's **Forms** tab.

## Add a client

In `index.html`, find the Clientele section (`#clients`) and duplicate one `<article class="client">` block inside `<div class="clients">`, then edit its sector label, name, location line, description and the Engagement and Scope entries. The grid wraps automatically.

## Design tokens

Defined as CSS custom properties on `:root` in `assets/css/site.css`.

| Token | Value | Use |
|---|---|---|
| `--oxblood` | `#5C1A1B` | Headlines, primary buttons, footer |
| `--oxblood-deep` | `#481313` | Primary button hover |
| `--ivory` | `#F4EFE4` | Page background |
| `--vellum` | `#EAE3D3` | Alternate section background |
| `--vellum-line` | `#D8CFBC` | Hairlines and inner frames |
| `--brass` | `#A88B4A` | Rules, borders and ornaments only |
| `--brass-text` | `#7A6430` | Small brass-coloured text (WCAG AA on ivory) |
| `--ink` | `#1C1B19` | Body text |
| `--olive` | `#8A8D7A` | Rules and borders only |
| `--olive-text` | `#5F6253` | Small olive text (WCAG AA on ivory) |

Type: **Libre Caslon Display** for headlines and prices, and **Libre Caslon Text** for everything else. Both are self-hosted.

The site uses a light theme only, by design. It loads no analytics or tracking scripts.
