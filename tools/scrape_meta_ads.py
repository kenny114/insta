"""
Scrape recruitment-related ads from Meta Ad Library via Apify.
Uses curious_coder/facebook-ads-library-scraper which takes Ad Library URLs.

Usage:
    python scrape_meta_ads.py [--service recruitment|performance_management|learning_development]

Output:
    .tmp/research/meta_ads.json
"""

import argparse
import sys
import time
from pathlib import Path
from urllib.parse import urlencode

sys.path.insert(0, str(Path(__file__).parent))
from config import (
    APIFY_API_TOKEN, APIFY_ACTOR_ID,
    RESEARCH_DIR, SERVICE_LINES, MAX_RESEARCH_RESULTS,
)
from utils import save_json, timestamp
import requests

APIFY_BASE = "https://api.apify.com/v2"


def _build_ad_library_url(search_term: str, country: str = "US") -> str:
    params = {
        "active_status": "all",
        "ad_type": "all",
        "country": country,
        "q": search_term,
        "search_type": "keyword_unordered",
        "media_type": "all",
    }
    return "https://www.facebook.com/ads/library/?" + urlencode(params)


def search_meta_ads(search_terms: list[str], limit: int = 25) -> list[dict]:
    """Query Meta Ad Library via Apify actor for ads matching search terms."""
    if not APIFY_API_TOKEN:
        print("ERROR: APIFY_API_TOKEN not set in .env")
        return []

    urls = [_build_ad_library_url(term) for term in search_terms]
    print(f"  Starting Apify run with {len(urls)} search URLs...")

    payload = {
        "urls": [{"url": u} for u in urls],
        "totalNumberOfRecordsRequired": min(limit * len(search_terms), 200),
    }

    # Start async run
    try:
        resp = requests.post(
            f"{APIFY_BASE}/acts/{APIFY_ACTOR_ID}/runs",
            params={"token": APIFY_API_TOKEN},
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
        run_data = resp.json()
        run_id = run_data["data"]["id"]
        print(f"  Run started: {run_id}")
    except Exception as e:
        print(f"  Failed to start Apify run: {e}")
        return []

    # Poll until finished
    max_wait = 600  # 10 minutes
    poll_interval = 15
    elapsed = 0
    while elapsed < max_wait:
        time.sleep(poll_interval)
        elapsed += poll_interval
        try:
            status_resp = requests.get(
                f"{APIFY_BASE}/acts/{APIFY_ACTOR_ID}/runs/{run_id}",
                params={"token": APIFY_API_TOKEN},
                timeout=15,
            )
            status_resp.raise_for_status()
            status = status_resp.json()["data"]["status"]
            print(f"  [{elapsed}s] Status: {status}")
            if status == "SUCCEEDED":
                break
            elif status in ("FAILED", "ABORTED", "TIMED-OUT"):
                print(f"  Run ended with status: {status}")
                return []
        except Exception as e:
            print(f"  Polling error: {e}")

    # Fetch results
    try:
        items_resp = requests.get(
            f"{APIFY_BASE}/acts/{APIFY_ACTOR_ID}/runs/{run_id}/dataset/items",
            params={"token": APIFY_API_TOKEN, "format": "json"},
            timeout=60,
        )
        items_resp.raise_for_status()
        items = items_resp.json()
        print(f"  Apify returned {len(items)} ads")
    except Exception as e:
        print(f"  Failed to fetch results: {e}")
        return []

    all_ads = []
    for item in items:
        all_ads.append({
            "source": "meta_ad_library",
            "search_term": item.get("searchTerm") or item.get("q", ""),
            "ad_id": item.get("adArchiveID") or item.get("id"),
            "page_name": item.get("pageName") or item.get("page_name"),
            "bodies": _extract_list(item, ["adCreativeBodies", "bodies", "ad_creative_bodies"]),
            "titles": _extract_list(item, ["adCreativeLinkTitles", "titles", "ad_creative_link_titles"]),
            "descriptions": _extract_list(item, ["adCreativeLinkDescriptions", "descriptions"]),
            "snapshot_url": item.get("adSnapshotURL") or item.get("snapshot_url"),
            "platforms": item.get("publisherPlatform") or item.get("platforms", []),
            "audience_size": item.get("reachEstimate") or {},
        })
    return all_ads


def _extract_list(item: dict, keys: list[str]) -> list[str]:
    for key in keys:
        val = item.get(key)
        if isinstance(val, list) and val:
            return val
    cards = item.get("cards", [])
    if cards:
        return [c.get("body", "") or c.get("title", "") for c in cards if c.get("body") or c.get("title")]
    return []


def main():
    parser = argparse.ArgumentParser(description="Scrape Meta Ad Library via Apify")
    parser.add_argument("--service", choices=SERVICE_LINES.keys(), default="recruitment",
                        help="Service line to research")
    args = parser.parse_args()

    service = SERVICE_LINES[args.service]
    search_terms = service["keywords"][:4]

    print(f"Researching Meta ads for: {service['name']} (via Apify)")
    print(f"Search terms: {search_terms}")

    ads = search_meta_ads(search_terms, limit=MAX_RESEARCH_RESULTS)

    output = {
        "service": args.service,
        "timestamp": timestamp(),
        "total_ads": len(ads),
        "ads": ads,
    }

    output_path = RESEARCH_DIR / "meta_ads.json"
    save_json(output, output_path)
    print(f"\nSaved {len(ads)} ads to {output_path}")


if __name__ == "__main__":
    main()
