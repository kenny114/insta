# Workflow: Score & Iterate on Ads

## Objective
Score generated ads against best practices and automatically iterate to improve them until they pass the quality threshold.

## Required Inputs
- **Composed flyers** from `workflows/generate_ad.md`
- **Copy JSON** used to generate those flyers
- **API keys in `.env`**: `OPENAI_API_KEY`

## Settings (in `tools/config.py`)
- `MIN_SCORE_THRESHOLD`: 7.5/10 — ads must score above this to pass
- `MAX_ITERATIONS`: 3 — maximum improvement cycles before stopping
- `SCORING_CRITERIA`: visual appeal, copy clarity, CTA strength, brand alignment, audience fit, overall effectiveness

## Steps

### 1. Score Existing Ads
```bash
cd tools
# Score a single ad
python score_ad.py --image .tmp/output/final/flyer_v1_instagram_square_TIMESTAMP.png

# Score all ads from a compose run
python score_ad.py --manifest .tmp/output/final/compose_manifest_TIMESTAMP.json
```
- Uses GPT-4 Vision to evaluate each ad on 6 criteria
- Compares against research benchmarks if `analysis.json` exists
- Output: `.tmp/output/scores_{timestamp}.json`

### 2. Auto-Iterate (if needed)
```bash
python iterate_ad.py --scores .tmp/output/scores_TIMESTAMP.json --copy-file .tmp/output/copy_recruitment_flyer_TIMESTAMP.json --service recruitment
```
For each ad that didn't pass the threshold:
1. GPT-4 improves the copy based on specific feedback
2. DALL-E generates a new background
3. Pillow composes the updated flyer
4. GPT-4 Vision re-scores

Stops when:
- Score passes the threshold (7.5+)
- Max iterations reached (3)
- Score starts declining (revert to previous)

Output:
- Improved flyers in `.tmp/output/final/`
- Version history in `.tmp/output/versions/`
- Summary in `.tmp/output/iteration_summary_{timestamp}.json`

## Expected Output
- `scores_*.json`: Detailed scores with actionable feedback for each ad
- `iteration_summary_*.json`: History of improvements and score changes
- Improved PNGs in `final/` directory
- Full version history preserved in `versions/`

## Edge Cases
- **Score declining**: Iteration auto-stops and reverts if score drops by 0.5+
- **Image generation fails**: Falls back to reusing the previous background with improved copy only
- **Already passing**: Ads that already score 7.5+ are skipped
- **All pass first try**: No iteration needed — the generate workflow nailed it

## Notes
- Review `scores_*.json` manually even if ads pass — the feedback is useful for future runs
- Version history in `.tmp/output/versions/` preserves every iteration so you can compare
- If the tool hits paid API limits, it will ask before retrying (per CLAUDE.md instructions)
- Consider adjusting `MIN_SCORE_THRESHOLD` in config.py if you want higher/lower quality gates
