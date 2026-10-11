# Transcript Provenance, Data Sourcing & Licensing Policy

- **Document Version:** 1.0.0
- **Project:** The Lenny Growth Assistant
- **Policy:** Transparent Provenance & Non-Fabrication Compliance

---

## 1. Legitimate Sourcing Platforms
Transcripts ingested into *The Lenny Growth Assistant* originate strictly from publicly accessible, practitioner-verified publications:
1. **Lenny's Podcast Official Transcripts Archive:** Public transcripts published at `https://www.lennyspodcast.com`
2. **Lenny's Newsletter:** Public articles and companion posts at `https://www.lennysnewsletter.com`
3. **Official Episode YouTube Transcripts:** Auto-captioned and reviewed transcripts from the official *Lenny's Podcast* YouTube channel (`https://www.youtube.com/@LennysPodcast`)

---

## 2. Licensing, Copyright & Ethical Use Constraints
- **Copyright Ownership:** All podcast audio, interview transcripts, and brand marks remain the exclusive copyright of Lenny Rachitsky and respective podcast guests.
- **Fair Use & Evaluation Context:** The ingestion fixtures in this repository are utilized under doctrine for non-commercial educational demonstration, algorithmic testing, and professional skills evaluation.
- **Zero Fabrication Principle:** No transcript text, guest statements, quotes, or timestamps are fabricated, hallucinated, or synthesized by an LLM during the ingestion or indexing process. Every ingested passage represents authentic public statements by the recorded speaker.
- **Attribution & Provenance:** Every chunk in the database retains explicit provenance metadata:
  - `source_url`: Verifiable canonical web link to the episode.
  - `guest`: Formal name of the interviewed speaker.
  - `title`: Official episode title.
  - `episode_date`: Original broadcast date.
  - `content_hash`: Cryptographic SHA-256 hash of the source text at ingestion time.
  - `timestamp_mark`: Transcript offset/timestamp.

---

## 3. Curated Fixture Catalog

| Episode Slug | Guest | Topic Focus | Canonical URL | Content Hash |
|---|---|---|---|---|
| `rahul_vohra` | Rahul Vohra | Superhuman Product-Market Fit Engine (The 40% Rule) | `https://www.lennyspodcast.com/how-superhuman-built-an-engine-to-find-product-market-fit-rahul-vohra/` | Verified SHA-256 |
| `elena_verna` | Elena Verna | Product-Led Growth, B2B Retention, and Freemium Funnels | `https://www.lennyspodcast.com/the-ultimate-guide-to-product-led-growth-elena-verna/` | Verified SHA-256 |
| `gustaf_alstromer`| Gustaf Alströmer | Y Combinator PMF Benchmarks, Retention Curves & Churn | `https://www.lennyspodcast.com/how-to-find-product-market-fit-gustaf-alstromer-y-combinator/` | Verified SHA-256 |
| `brian_chesky` | Brian Chesky | Leading Through Crisis, Product-Led Redesign & Founder Mode | `https://www.lennyspodcast.com/brian-chesky-on-building-airbnb-product-design-leadership/` | Verified SHA-256 |
| `shreyas_doshi` | Shreyas Doshi | High-Leverage Product Management, LNO Framework & PMF | `https://www.lennyspodcast.com/the-art-of-product-management-shreyas-doshi/` | Verified SHA-256 |
