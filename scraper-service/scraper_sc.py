import requests
from bs4 import BeautifulSoup
from datetime import datetime
from db import judgments_col
from pdf_utils import extract_pdf_text

BASE_URL = "https://main.sci.gov.in"

def scrape_sc_judgments(limit=5):
    url = f"{BASE_URL}/judgments"
    res = requests.get(url, timeout=20)
    res.raise_for_status()

    soup = BeautifulSoup(res.text, "html.parser")
    rows = soup.select("table tr")[1:limit+1]  # skip header

    inserted_count = 0

    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 5:
            continue

        case_title = cols[1].get_text(strip=True)
        judges = cols[2].get_text(strip=True)
        date_str = cols[3].get_text(strip=True)
        pdf_link = BASE_URL + cols[4].find("a")["href"]

        # Download PDF
        pdf_res = requests.get(pdf_link, timeout=30)
        pdf_res.raise_for_status()

        full_text = extract_pdf_text(pdf_res.content)

        case_json = {
            "id": f"sc_{case_title[:30].replace(' ', '_')}_{date_str}",
            "case_title": case_title,
            "court": "Supreme Court of India",
            "judges": judges.split(","),
            "date": datetime.strptime(date_str, "%d-%m-%Y"),
            "citation": None,  # can parse later
            "pdf_url": pdf_link,
            "text": full_text,
            "summary": "",
            "referenced_sections": [],  # can extract later with regex
            "source_url": url
        }

        # Save to MongoDB (ignore duplicates)
        if not judgments_col.find_one({"id": case_json["id"]}):
            judgments_col.insert_one(case_json)
            inserted_count += 1

    return inserted_count
