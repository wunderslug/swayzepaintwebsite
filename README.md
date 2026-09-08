# Swayze Painting & Fine Finish

Static website for Swayze Painting & Fine Finish.

## Architecture

- Public site: static HTML/CSS/JavaScript
- Deployment target: Cloudflare Pages
- Source/content metadata: GitHub
- Project photography: Cloudflare R2 (planned)
- Gallery manager: lightweight authenticated management interface (planned)

## Content

`content/projects.json` contains published project metadata. Project media URLs will point to optimized images in R2.

`content/reviews.json` contains curated Google reviews displayed as testimonials.

## Deployment

The existing WordPress site should remain live until this replacement has been fully tested on a Cloudflare Pages preview domain. Do not point `swayzepaint.com` at this project until the replacement is approved.