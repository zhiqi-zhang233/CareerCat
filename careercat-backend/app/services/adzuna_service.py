from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json

from app.config import ADZUNA_APP_ID, ADZUNA_APP_KEY, ADZUNA_COUNTRY


def search_adzuna_jobs(
    keywords: str,
    location: str = "",
    country: str = "",
    posted_within_days: int = 7,
    results_per_page: int = 20,
    remote_only: bool = False,
    salary_min: int | None = None,
):
    if not ADZUNA_APP_ID or not ADZUNA_APP_KEY:
        raise ValueError("Adzuna credentials are not configured.")

    country_code = (country or ADZUNA_COUNTRY or "us").lower()
    params = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_APP_KEY,
        "results_per_page": max(1, min(results_per_page, 50)),
        "what": keywords,
        "content-type": "application/json",
        "sort_by": "date",
    }

    if location:
        params["where"] = location

    if posted_within_days:
        params["max_days_old"] = max(1, min(posted_within_days, 60))

    if remote_only:
        params["what_or"] = "remote"

    if salary_min:
        params["salary_min"] = salary_min

    url = (
        f"https://api.adzuna.com/v1/api/jobs/{country_code}/search/1?"
        f"{urlencode(params)}"
    )
    request = Request(url, headers={"User-Agent": "CareerCat/1.0"})

    with urlopen(request, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))

    return payload.get("results", [])
