import requests
from bs4 import BeautifulSoup
import fitz  # PyMuPDF
import io
import re
from datetime import datetime
from pymongo import MongoClient
import time
import logging
from typing import List, Dict, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SCJudgmentScraper:
    def __init__(self, mongo_uri: str = "mongodb://admin:password@localhost:27018/indian_law_db?authSource=admin"):
        """Initialize the SC Judgment Scraper"""
        self.base_url = "https://main.sci.gov.in"
        self.judgments_url = "https://main.sci.gov.in/judgments"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        # Disable SSL verification for development (not recommended for production)
        self.session.verify = False
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        
        # MongoDB connection
        try:
            self.client = MongoClient(mongo_uri)
            self.db = self.client["indian_law_db"]
            self.judgments = self.db["judgments"]
            logger.info("MongoDB connection established")
        except Exception as e:
            logger.error(f"MongoDB connection failed: {e}")
            raise

    def get_judgment_list(self, limit: int = 5) -> List[Dict]:
        """Fetch judgment list from SC website"""
        try:
            logger.info(f"Fetching judgment list from {self.judgments_url}")
            response = self.session.get(self.judgments_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            judgments = []
            
            # Find judgment links (this will need to be adjusted based on actual HTML structure)
            judgment_links = soup.find_all('a', href=re.compile(r'/judgments/.*'))
            
            for i, link in enumerate(judgment_links[:limit]):
                try:
                    judgment_url = self.base_url + link['href']
                    judgment_data = self.extract_judgment_info(judgment_url)
                    if judgment_data:
                        judgments.append(judgment_data)
                    time.sleep(1)  # Be respectful to the server
                except Exception as e:
                    logger.error(f"Error processing judgment {i}: {e}")
                    continue
            
            return judgments
            
        except Exception as e:
            logger.error(f"Error fetching judgment list: {e}")
            return []

    def extract_judgment_info(self, judgment_url: str) -> Optional[Dict]:
        """Extract judgment information from individual judgment page"""
        try:
            logger.info(f"Extracting judgment info from {judgment_url}")
            response = self.session.get(judgment_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract basic information (adjust selectors based on actual HTML)
            title = self.extract_title(soup)
            date = self.extract_date(soup)
            judges = self.extract_judges(soup)
            pdf_url = self.extract_pdf_url(soup)
            
            if not title or not pdf_url:
                logger.warning(f"Incomplete data for {judgment_url}")
                return None
            
            # Download and extract PDF text
            pdf_text = self.extract_pdf_text(pdf_url)
            
            # Create judgment document
            judgment_doc = {
                "id": self.generate_judgment_id(title, date),
                "case_title": title,
                "court": "Supreme Court of India",
                "judges": judges,
                "date": date,
                "citation": self.extract_citation(soup),
                "pdf_url": pdf_url,
                "text": pdf_text,
                "summary": self.generate_summary(pdf_text),
                "referenced_sections": self.extract_referenced_sections(pdf_text),
                "source_url": judgment_url,
                "tags": self.generate_tags(title, pdf_text),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            return judgment_doc
            
        except Exception as e:
            logger.error(f"Error extracting judgment info from {judgment_url}: {e}")
            return None

    def extract_title(self, soup: BeautifulSoup) -> str:
        """Extract case title from the page"""
        # Try multiple selectors to find the title
        selectors = [
            'h1', 'h2', '.title', '.case-title', '[class*="title"]',
            'title', '.judgment-title'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element and element.get_text().strip():
                return element.get_text().strip()
        
        # Fallback: try to find title in page title
        title_tag = soup.find('title')
        if title_tag:
            return title_tag.get_text().strip()
        
        return "Unknown Case Title"

    def extract_date(self, soup: BeautifulSoup) -> str:
        """Extract judgment date"""
        # Try to find date in various formats
        date_patterns = [
            r'\d{1,2}-\d{1,2}-\d{4}',
            r'\d{1,2}/\d{1,2}/\d{4}',
            r'\d{4}-\d{2}-\d{2}'
        ]
        
        text = soup.get_text()
        for pattern in date_patterns:
            match = re.search(pattern, text)
            if match:
                return match.group()
        
        return datetime.now().strftime("%Y-%m-%d")

    def extract_judges(self, soup: BeautifulSoup) -> List[str]:
        """Extract judge names"""
        # Look for judge information in the page
        judge_patterns = [
            r'Justice\s+[A-Z][a-z]+',
            r'Hon\'ble\s+Justice\s+[A-Z][a-z]+',
            r'Mr\.\s+Justice\s+[A-Z][a-z]+'
        ]
        
        text = soup.get_text()
        judges = []
        for pattern in judge_patterns:
            matches = re.findall(pattern, text)
            judges.extend(matches)
        
        return list(set(judges)) if judges else ["Unknown Judge"]

    def extract_pdf_url(self, soup: BeautifulSoup) -> str:
        """Extract PDF download URL"""
        # Look for PDF links
        pdf_links = soup.find_all('a', href=re.compile(r'\.pdf$'))
        if pdf_links:
            pdf_url = pdf_links[0]['href']
            if not pdf_url.startswith('http'):
                pdf_url = self.base_url + pdf_url
            return pdf_url
        
        # Look for download links
        download_links = soup.find_all('a', text=re.compile(r'download|pdf|judgment', re.I))
        if download_links:
            pdf_url = download_links[0]['href']
            if not pdf_url.startswith('http'):
                pdf_url = self.base_url + pdf_url
            return pdf_url
        
        return ""

    def extract_pdf_text(self, pdf_url: str) -> str:
        """Download PDF and extract text using PyMuPDF"""
        try:
            logger.info(f"Downloading PDF from {pdf_url}")
            response = self.session.get(pdf_url, timeout=60)
            response.raise_for_status()
            
            # Load PDF with PyMuPDF
            pdf_document = fitz.open(stream=response.content, filetype="pdf")
            text = ""
            
            for page_num in range(len(pdf_document)):
                page = pdf_document.load_page(page_num)
                text += page.get_text()
            
            pdf_document.close()
            return text.strip()
            
        except Exception as e:
            logger.error(f"Error extracting PDF text from {pdf_url}: {e}")
            return ""

    def extract_citation(self, soup: BeautifulSoup) -> str:
        """Extract legal citation"""
        # Look for citation patterns
        citation_patterns = [
            r'\(\d{4}\)\s+\d+\s+[A-Z]+\s+\d+',
            r'[A-Z]+\s+\d+/\d+',
            r'\(\d{4}\)\s+\d+\s+[A-Z]+'
        ]
        
        text = soup.get_text()
        for pattern in citation_patterns:
            match = re.search(pattern, text)
            if match:
                return match.group()
        
        return ""

    def generate_judgment_id(self, title: str, date: str) -> str:
        """Generate unique judgment ID"""
        # Create a simple ID from title and date
        title_slug = re.sub(r'[^a-zA-Z0-9]', '_', title.lower())
        title_slug = re.sub(r'_+', '_', title_slug)
        title_slug = title_slug[:50]  # Limit length
        
        date_slug = re.sub(r'[^0-9]', '', date)
        
        return f"sc_{title_slug}_{date_slug}"

    def generate_summary(self, text: str) -> str:
        """Generate a brief summary from the judgment text"""
        if not text:
            return ""
        
        # Take first 500 characters as summary
        summary = text[:500].strip()
        if len(text) > 500:
            summary += "..."
        
        return summary

    def extract_referenced_sections(self, text: str) -> List[str]:
        """Extract referenced legal sections from the text"""
        # Look for common legal section patterns
        section_patterns = [
            r'Section\s+\d+[A-Z]*\s+of\s+[A-Z]+',
            r'Article\s+\d+[A-Z]*',
            r'[A-Z]+\s+\d+[A-Z]*',
            r'Section\s+\d+[A-Z]*'
        ]
        
        sections = []
        for pattern in section_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            sections.extend(matches)
        
        return list(set(sections))

    def generate_tags(self, title: str, text: str) -> List[str]:
        """Generate tags for the judgment"""
        tags = []
        
        # Add court tag
        tags.append("supreme court")
        
        # Add common legal areas based on keywords
        legal_areas = {
            "constitutional law": ["constitution", "fundamental rights", "article"],
            "criminal law": ["criminal", "penal", "offence", "punishment"],
            "civil law": ["civil", "contract", "tort", "property"],
            "family law": ["marriage", "divorce", "custody", "family"],
            "commercial law": ["commercial", "business", "company", "corporate"],
            "administrative law": ["administrative", "government", "public"]
        }
        
        combined_text = (title + " " + text).lower()
        for area, keywords in legal_areas.items():
            if any(keyword in combined_text for keyword in keywords):
                tags.append(area)
        
        return tags

    def save_to_mongodb(self, judgment_doc: Dict) -> bool:
        """Save judgment document to MongoDB"""
        try:
            # Check if judgment already exists
            existing = self.judgments.find_one({"id": judgment_doc["id"]})
            if existing:
                logger.info(f"Judgment {judgment_doc['id']} already exists, updating")
                self.judgments.update_one(
                    {"id": judgment_doc["id"]},
                    {"$set": judgment_doc}
                )
            else:
                logger.info(f"Inserting new judgment {judgment_doc['id']}")
                self.judgments.insert_one(judgment_doc)
            
            return True
            
        except Exception as e:
            logger.error(f"Error saving to MongoDB: {e}")
            return False

    def scrape_judgments(self, limit: int = 5) -> Dict:
        """Main method to scrape judgments"""
        logger.info(f"Starting SC judgment scraping for {limit} judgments")
        
        judgments = self.get_judgment_list(limit)
        inserted_count = 0
        
        for judgment in judgments:
            if self.save_to_mongodb(judgment):
                inserted_count += 1
                logger.info(f"Successfully saved judgment: {judgment['case_title']}")
            else:
                logger.error(f"Failed to save judgment: {judgment['case_title']}")
        
        logger.info(f"Scraping completed. {inserted_count}/{len(judgments)} judgments saved")
        
        return {
            "status": "completed",
            "total_found": len(judgments),
            "inserted_count": inserted_count,
            "judgments": [j["id"] for j in judgments]
        }

    def close(self):
        """Close MongoDB connection"""
        if hasattr(self, 'client'):
            self.client.close()
            logger.info("MongoDB connection closed")
