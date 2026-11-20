# Curated location photos

These ten bundled photos depict the named areas. `byblos.jpg` covers the catalog's canonical Byblos / Jbeil record. The small-town city records reuse their corresponding area photo.

See [public photo credits](credits.html) and [machine-readable source/license metadata](credits.json). Each derivative retains its original photo license. Files are Wikimedia 330px renditions; the UI uses a square cover crop. No color/content edits. Total payload is approximately 330 KB.

The API serves this directory at `/assets/search/areas/`; `npm run build` automatically copies this complete directory, including credits, into `dist/assets/search/areas/`. Deploy the complete `dist/` tree; no separate manual photo copy is required. Development falls back to the source assets. No remote image service is needed at runtime. `search_locations.image_url` can also hold an explicitly curated HTTPS URL. Clearing it restores the brand-tinted icon; listing photos are never used for area/city cards.

Apply locally with `npm run db:search:images-apply` from backend. This applies only migration 0043 and the image seed to loopback studently_dev, preserving inventory and manually curated image URLs.
