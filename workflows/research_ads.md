# Workflow: Research Recruitment Ads

## Objective
Collect and analyze top-performing recruitment, HR, and L&D ads from Meta, LinkedIn, and the web to establish best practices for ad generation.

## Required Inputs
- **Service line**: `recruitment`, `performance_management`, or `learning_development`
- **API keys in `.env`**: `META_ACCESS_TOKEN`, `GOOGLE_API_KEY`, `GOOGLE_CSE_ID`

## Steps

### 1. Scrape Meta Ad Library
```bash
cd tools
python scrape_meta_ads.py --service recruitment
```
- Searches Meta Ad Library for ads matching service keywords
- Falls back to mock data if `META_ACCESS_TOKEN` is not set
- Output: `.tmp/research/meta_ads.json`

### 2. Scrape Web Examples
```bash
python scrape_web_ads.py --service recruitment
# Add --download-images to save reference images locally
python scrape_web_ads.py --service recruitment --download-images
```
- Searches Google Custom Search for ad images and articles
- Deduplicates results automatically
- Output: `.tmp/research/web_ads.json`, `.tmp/research/images/`

### 3. Analyze Collected Data
```bash
python analyze_ads.py --service recruitment
```
- Uses GPT-4 to analyze all collected ads
- Identifies copy patterns, visual patterns, and best practices
- Output: `.tmp/research/analysis.json`

## Expected Output
`analysis.json` contains:
- **Copy analysis**: headline patterns, power words, CTA phrases, messaging strategy
- **Visual analysis**: color patterns, layout structures, typography, imagery
- **Recommendations**: do's and don'ts for both copy and visuals

## Edge Cases
- **No API keys**: Both scrapers have mock data fallbacks for development
- **Rate limiting**: Google CSE has 100 queries/day free tier. Space out searches.
- **No results**: If a search returns nothing, the analyzer still works with whatever data is available from other sources

## Notes
- Run this workflow at least once before generating ads — the analysis feeds directly into copy and image generation
- Re-run periodically (monthly) to keep research current
- Downloaded images in `.tmp/research/images/` enable GPT-4 Vision analysis for better visual insights
