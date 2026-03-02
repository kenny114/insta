# Workflow: Generate Recruitment Ad/Flyer

## Objective
Generate production-ready ad and flyer images with compelling copy for recruitment/HR services.

## Required Inputs
- **Service line**: `recruitment`, `performance_management`, or `learning_development`
- **Ad type**: `flyer`, `social_ad`, `story_ad`, or `linkedin_ad`
- **Ad sizes**: `instagram_square`, `facebook_feed`, `linkedin_feed`, etc.
- **API keys in `.env`**: `OPENAI_API_KEY`

## Prerequisites
- Run `workflows/research_ads.md` first (optional but strongly recommended)
- `.tmp/research/analysis.json` should exist for best results

## Steps

### 1. Generate Copy
```bash
cd tools
python generate_copy.py --service recruitment --type flyer --variants 3
```
- Generates 3 copy variants (pain-point, aspiration, authority angles)
- Uses research analysis for context if available
- Output: `.tmp/output/copy_{service}_{type}_{timestamp}.json`

Optional: Add a custom brief
```bash
python generate_copy.py --service recruitment --type social_ad --brief "Focus on tech hiring for startups"
```

### 2. Generate Background Images
```bash
python generate_flyer.py --service recruitment --copy-file .tmp/output/copy_recruitment_flyer_TIMESTAMP.json --size instagram_square facebook_feed
```
- Generates DALL-E backgrounds informed by copy and research
- Creates images for each specified size
- Output: `.tmp/output/dalle_v*_*.png` + manifest JSON

### 3. Compose Final Flyers
```bash
python compose_flyer.py --manifest .tmp/output/dalle_manifest_TIMESTAMP.json --copy-file .tmp/output/copy_recruitment_flyer_TIMESTAMP.json
```
- Overlays copy onto DALL-E backgrounds using Pillow
- Adds gradient overlays, accent bars, CTA buttons
- Applies brand typography and colors
- Output: `.tmp/output/final/flyer_v*_*.png`

## Expected Output
Production-ready PNG files in `.tmp/output/final/` with:
- Professional background from DALL-E
- Headline, subheadline, body copy, bullet points
- Prominent CTA button
- Brand-consistent colors and typography

## Edge Cases
- **No research data**: Copy generation still works, just without research-informed context
- **DALL-E rate limits**: The tool handles retries. If persistent, wait a few minutes.
- **Font not found**: Pillow falls back to default system fonts
- **Copy too long**: The text wrapping engine handles overflow, but shorter copy always works better

## Notes
- Always review the copy JSON before composing — you can manually edit variants
- For best results, use the `--download-images` flag in research to enable vision-based analysis
- Each run creates timestamped files so nothing gets overwritten
