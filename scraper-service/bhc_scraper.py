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

class BHCJudgmentScraper:
    def __init__(self, mongo_uri: str = "mongodb://admin:password@localhost:27018/indian_law_db?authSource=admin"):
        """Initialize the Bombay High Court Judgment Scraper"""
        self.base_url = "https://bombayhighcourt.nic.in"
        self.judgments_url = "https://bombayhighcourt.nic.in/index.php"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        # Disable SSL verification for development
        self.session.verify = False
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        
        # MongoDB connection
        try:
            self.client = MongoClient(mongo_uri)
            self.db = self.client["indian_law_db"]
            self.judgments = self.db["judgments"]
            logger.info("MongoDB connection established for BHC scraper")
        except Exception as e:
            logger.error(f"MongoDB connection failed: {e}")
            raise

    def get_judgment_list(self, limit: int = 5) -> List[Dict]:
        """Fetch judgment list from Bombay High Court website"""
        try:
            logger.info(f"Fetching judgment list from {self.judgments_url}")
            response = self.session.get(self.judgments_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            judgments = []
            
            # Look for judgment links
            judgment_links = soup.find_all('a', href=re.compile(r'judgments?|judgment|order'))
            
            # Also look for links in common judgment sections
            judgment_sections = soup.find_all(['div', 'section'], class_=re.compile(r'judgment|order|latest'))
            for section in judgment_sections:
                judgment_links.extend(section.find_all('a', href=True))
            
            # Remove duplicates
            unique_links = []
            seen_urls = set()
            for link in judgment_links:
                href = link.get('href', '')
                if href and href not in seen_urls:
                    seen_urls.add(href)
                    unique_links.append(link)
            
            for i, link in enumerate(unique_links[:limit]):
                try:
                    href = link.get('href', '')
                    if href.startswith('http'):
                        judgment_url = href
                    else:
                        judgment_url = self.base_url + href if href.startswith('/') else self.base_url + '/' + href
                    
                    judgment_data = self.extract_judgment_info(judgment_url, link)
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

    def extract_judgment_info(self, judgment_url: str, link_element=None) -> Optional[Dict]:
        """Extract judgment information from individual judgment page"""
        try:
            logger.info(f"Extracting judgment info from {judgment_url}")
            response = self.session.get(judgment_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract basic information
            title = self.extract_title(soup, link_element)
            date = self.extract_date(soup, link_element)
            judges = self.extract_judges(soup)
            pdf_url = self.extract_pdf_url(soup, judgment_url)
            
            if not title:
                logger.warning(f"No title found for {judgment_url}")
                return None
            
            # Download and extract PDF text if available
            pdf_text = ""
            if pdf_url:
                pdf_text = self.extract_pdf_text(pdf_url)
            
            # Create judgment document
            judgment_doc = {
                "id": self.generate_judgment_id(title, date),
                "case_title": title,
                "court": "Bombay High Court",
                "judges": judges,
                "date": date,
                "citation": self.extract_citation(soup),
                "pdf_url": pdf_url,
                "text": pdf_text,
                "summary": self.generate_summary(pdf_text),
                "referenced_sections": self.extract_referenced_sections(pdf_text),
                "tags": self.generate_tags(title, pdf_text),
                "source_url": judgment_url,
                "scraped_at": datetime.now().isoformat()
            }
            
            return judgment_doc
            
        except Exception as e:
            logger.error(f"Error extracting judgment info from {judgment_url}: {e}")
            return None

    def extract_title(self, soup: BeautifulSoup, link_element=None) -> str:
        """Extract judgment title"""
        # Try multiple selectors for title
        title_selectors = [
            'h1', 'h2', 'h3',
            '.title', '.judgment-title', '.case-title',
            '[class*="title"]', '[class*="judgment"]',
            '.heading', '.case-heading'
        ]
        
        for selector in title_selectors:
            title_elem = soup.select_one(selector)
            if title_elem and title_elem.get_text().strip():
                return title_elem.get_text().strip()
        
        # If no title found in page, try to extract from link text
        if link_element:
            link_text = link_element.get_text().strip()
            if link_text and len(link_text) > 10:
                return link_text
        
        return "Bombay High Court Judgment"

    def extract_date(self, soup: BeautifulSoup, link_element=None) -> str:
        """Extract judgment date"""
        # Look for date patterns in the page
        date_patterns = [
            r'\d{1,2}[/-]\d{1,2}[/-]\d{4}',
            r'\d{4}[/-]\d{1,2}[/-]\d{1,2}',
            r'\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}',
            r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}'
        ]
        
        page_text = soup.get_text()
        for pattern in date_patterns:
            matches = re.findall(pattern, page_text, re.IGNORECASE)
            if matches:
                return matches[0]
        
        # If no date found, use current date
        return datetime.now().strftime("%Y-%m-%d")

    def extract_judges(self, soup: BeautifulSoup) -> List[str]:
        """Extract judge names"""
        judges = []
        
        # Look for judge patterns
        judge_patterns = [
            r'Hon\'?ble\s+(?:Mr\.?\s+)?Justice\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
            r'Justice\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
            r'J\.\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
            r'Coram\s*:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)'
        ]
        
        page_text = soup.get_text()
        for pattern in judge_patterns:
            matches = re.findall(pattern, page_text, re.IGNORECASE)
            judges.extend(matches)
        
        return list(set(judges)) if judges else ["Bombay High Court"]

    def extract_pdf_url(self, soup: BeautifulSoup, base_url: str) -> str:
        """Extract PDF URL"""
        # Look for PDF links
        pdf_links = soup.find_all('a', href=re.compile(r'\.pdf$', re.I))
        if pdf_links:
            href = pdf_links[0].get('href')
            if href.startswith('http'):
                return href
            else:
                return self.base_url + href if href.startswith('/') else self.base_url + '/' + href
        
        # Also look for links with "pdf" in the text
        pdf_text_links = soup.find_all('a', string=re.compile(r'pdf|PDF', re.I))
        if pdf_text_links:
            href = pdf_text_links[0].get('href')
            if href.startswith('http'):
                return href
            else:
                return self.base_url + href if href.startswith('/') else self.base_url + '/' + href
        
        return ""

    def extract_pdf_text(self, pdf_url: str) -> str:
        """Extract text from PDF"""
        if not pdf_url:
            return ""
        
        try:
            logger.info(f"Downloading PDF from {pdf_url}")
            response = self.session.get(pdf_url, timeout=30)
            response.raise_for_status()
            
            # Use PyMuPDF to extract text
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
        """Extract case citation"""
        # Look for citation patterns
        citation_patterns = [
            r'\([0-9]{4}\)\s*[A-Z]+\s+[0-9]+',
            r'[A-Z]+\s+[0-9]+\s*\([0-9]{4}\)',
            r'[A-Z]+\s+[0-9]+/[0-9]+',
            r'WP\s+[0-9]+/[0-9]+',
            r'CRL\s+[0-9]+/[0-9]+'
        ]
        
        page_text = soup.get_text()
        for pattern in citation_patterns:
            matches = re.findall(pattern, page_text)
            if matches:
                return matches[0]
        
        return ""

    def generate_judgment_id(self, title: str, date: str) -> str:
        """Generate unique judgment ID"""
        # Clean title for ID
        clean_title = re.sub(r'[^a-zA-Z0-9\s]', '', title)
        words = clean_title.split()[:3]  # Take first 3 words
        id_suffix = '_'.join(words).lower()
        
        # Clean date
        clean_date = re.sub(r'[^0-9]', '', date)[:8]  # Take first 8 digits
        
        return f"bhc_{id_suffix}_{clean_date}"

    def generate_summary(self, text: str) -> str:
        """Generate summary from judgment text"""
        if not text:
            return "Bombay High Court judgment"
        
        # Take first 200 characters as summary
        summary = text[:200].strip()
        if len(text) > 200:
            summary += "..."
        
        return summary

    def extract_referenced_sections(self, text: str) -> List[str]:
        """Extract referenced legal sections"""
        if not text:
            return []
        
        # Look for common legal section patterns
        section_patterns = [
            r'Section\s+[0-9]+[A-Z]*\s+of\s+[A-Z]+',
            r'[A-Z]+\s+Section\s+[0-9]+[A-Z]*',
            r'[A-Z]{2,}\s+[0-9]+[A-Z]*'
        ]
        
        sections = []
        for pattern in section_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            sections.extend(matches)
        
        return list(set(sections))

    def generate_tags(self, title: str, text: str) -> List[str]:
        """Generate tags from title and text"""
        tags = []
        
        # Common legal terms
        legal_terms = [
            'bail', 'anticipatory', 'constitutional', 'criminal', 'civil',
            'writ', 'petition', 'appeal', 'revision', 'review',
            '498A', 'IPC', 'CrPC', 'CPC', 'Constitution'
        ]
        
        combined_text = (title + " " + text).lower()
        for term in legal_terms:
            if term.lower() in combined_text:
                tags.append(term)
        
        return tags

    def save_to_mongodb(self, judgment_doc: Dict) -> bool:
        """Save judgment to MongoDB"""
        try:
            # Check if judgment already exists
            existing = self.judgments.find_one({"id": judgment_doc["id"]})
            if existing:
                logger.info(f"Judgment {judgment_doc['id']} already exists, skipping")
                return False
            
            # Insert new judgment
            result = self.judgments.insert_one(judgment_doc)
            logger.info(f"Saved judgment {judgment_doc['id']} with MongoDB ID: {result.inserted_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving judgment to MongoDB: {e}")
            return False

    def scrape_judgments(self, limit: int = 5) -> Dict:
        """Main scraping function"""
        try:
            logger.info(f"Starting Bombay High Court judgment scraping (limit: {limit})")
            
            judgments = self.get_judgment_list(limit)
            total_found = len(judgments)
            inserted_count = 0
            
            for judgment in judgments:
                if self.save_to_mongodb(judgment):
                    inserted_count += 1
            
            logger.info(f"Scraping completed. Found: {total_found}, Inserted: {inserted_count}")
            
            return {
                "status": "success",
                "total_found": total_found,
                "inserted_count": inserted_count,
                "judgments": judgments
            }
            
        except Exception as e:
            logger.error(f"Error in scraping: {e}")
            return {
                "status": "error",
                "total_found": 0,
                "inserted_count": 0,
                "judgments": [],
                "error": str(e)
            }

    def close(self):
        """Close MongoDB connection"""
        if hasattr(self, 'client'):
            self.client.close()
            logger.info("MongoDB connection closed")
