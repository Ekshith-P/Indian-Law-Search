#!/usr/bin/env python3
"""
Auto Scraper for Indian Legal Cases
Runs daily at 6 AM to scrape new cases and update the database
"""

import os
import sys
import time
import logging
import schedule
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from pymongo import MongoClient
from elasticsearch import Elasticsearch
from summarizer import LegalCaseSummarizer
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scraper.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class LegalCaseScraper:
    def __init__(self):
        # Initialize connections
        self.mongo_client = MongoClient("mongodb://admin:password@localhost:27018/indian_law_db?authSource=admin")
        self.db = self.mongo_client.indian_law_db
        self.es_client = Elasticsearch("http://localhost:9201", basic_auth=("elastic", "changeme"))
        
        # Initialize summarizer
        self.summarizer = LegalCaseSummarizer()
        
        # Scraping sources
        self.sources = {
            'supreme_court': {
                'name': 'Supreme Court of India',
                'url': 'https://main.sci.gov.in/judgments',
                'type': 'judgment'
            },
            'delhi_high_court': {
                'name': 'Delhi High Court',
                'url': 'https://delhihighcourt.nic.in/judgments',
                'type': 'judgment'
            },
            'bombay_high_court': {
                'name': 'Bombay High Court',
                'url': 'https://bombayhighcourt.nic.in/judgments',
                'type': 'judgment'
            }
        }
        
        # Chrome options for Selenium
        self.chrome_options = Options()
        self.chrome_options.add_argument('--headless')
        self.chrome_options.add_argument('--no-sandbox')
        self.chrome_options.add_argument('--disable-dev-shm-usage')
        self.chrome_options.add_argument('--disable-gpu')
        self.chrome_options.add_argument('--window-size=1920,1080')

    def setup_driver(self):
        """Setup Chrome WebDriver"""
        try:
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=self.chrome_options)
            return driver
        except Exception as e:
            logger.error(f"Failed to setup Chrome driver: {e}")
            return None

    def scrape_supreme_court(self) -> List[Dict]:
        """Scrape Supreme Court judgments"""
        logger.info("Scraping Supreme Court judgments...")
        cases = []
        
        try:
            driver = self.setup_driver()
            if not driver:
                return cases
            
            driver.get(self.sources['supreme_court']['url'])
            time.sleep(5)
            
            # Wait for page to load
            wait = WebDriverWait(driver, 10)
            wait.until(EC.presence_of_element_located((By.CLASS_NAME, "judgment-list")))
            
            # Extract case information
            case_elements = driver.find_elements(By.CLASS_NAME, "judgment-item")
            
            for case_element in case_elements[:10]:  # Limit to 10 cases
                try:
                    case_title = case_element.find_element(By.CLASS_NAME, "case-title").text
                    case_date = case_element.find_element(By.CLASS_NAME, "case-date").text
                    case_url = case_element.find_element(By.TAG_NAME, "a").get_attribute("href")
                    
                    # Extract case details
                    case_details = self.extract_case_details(driver, case_url)
                    
                    if case_details:
                        case_data = {
                            'case_title': case_title,
                            'date': case_date,
                            'court': 'Supreme Court of India',
                            'url': case_url,
                            'text': case_details.get('text', ''),
                            'judges': case_details.get('judges', []),
                            'citation': case_details.get('citation', ''),
                            'source': 'Supreme Court Website',
                            'scraped_at': datetime.now().isoformat()
                        }
                        
                        # Generate summary
                        case_data['summary'] = self.summarizer.extract_case_summary(
                            case_data['text'], 
                            case_data['case_title']
                        )
                        
                        cases.append(case_data)
                        
                except Exception as e:
                    logger.error(f"Error extracting case: {e}")
                    continue
            
            driver.quit()
            
        except Exception as e:
            logger.error(f"Error scraping Supreme Court: {e}")
        
        return cases

    def scrape_high_court(self, court_name: str, court_url: str) -> List[Dict]:
        """Scrape High Court judgments"""
        logger.info(f"Scraping {court_name} judgments...")
        cases = []
        
        try:
            driver = self.setup_driver()
            if not driver:
                return cases
            
            driver.get(court_url)
            time.sleep(5)
            
            # Generic high court scraping logic
            # This would need to be customized for each court's specific structure
            
            # For now, return empty list
            driver.quit()
            
        except Exception as e:
            logger.error(f"Error scraping {court_name}: {e}")
        
        return cases

    def extract_case_details(self, driver, case_url: str) -> Optional[Dict]:
        """Extract detailed case information"""
        try:
            driver.get(case_url)
            time.sleep(3)
            
            # Extract case text
            case_text = ""
            text_elements = driver.find_elements(By.CLASS_NAME, "judgment-text")
            if text_elements:
                case_text = text_elements[0].text
            
            # Extract judges
            judges = []
            judge_elements = driver.find_elements(By.CLASS_NAME, "judge-name")
            for judge_elem in judge_elements:
                judges.append(judge_elem.text)
            
            # Extract citation
            citation = ""
            citation_elements = driver.find_elements(By.CLASS_NAME, "citation")
            if citation_elements:
                citation = citation_elements[0].text
            
            return {
                'text': case_text,
                'judges': judges,
                'citation': citation
            }
            
        except Exception as e:
            logger.error(f"Error extracting case details: {e}")
            return None

    def save_to_mongodb(self, cases: List[Dict]) -> int:
        """Save scraped cases to MongoDB"""
        if not cases:
            return 0
        
        try:
            # Check for duplicates
            existing_titles = set()
            for case in self.db.judgments.find({}, {'case_title': 1}):
                existing_titles.add(case['case_title'])
            
            # Filter new cases
            new_cases = []
            for case in cases:
                if case['case_title'] not in existing_titles:
                    new_cases.append(case)
            
            if new_cases:
                result = self.db.judgments.insert_many(new_cases)
                logger.info(f"Saved {len(new_cases)} new cases to MongoDB")
                return len(new_cases)
            else:
                logger.info("No new cases found")
                return 0
                
        except Exception as e:
            logger.error(f"Error saving to MongoDB: {e}")
            return 0

    def index_to_elasticsearch(self, cases: List[Dict]) -> int:
        """Index new cases to Elasticsearch"""
        if not cases:
            return 0
        
        try:
            indexed_count = 0
            
            for case in cases:
                # Prepare document for ES
                doc = {
                    'case_title': case['case_title'],
                    'court': case['court'],
                    'judges': case['judges'],
                    'date': case['date'],
                    'citation': case['citation'],
                    'text': case['text'],
                    'summary': case['summary'],
                    'source': case['source'],
                    'scraped_at': case['scraped_at'],
                    'created_at': datetime.now().isoformat()
                }
                
                # Index to ES
                try:
                    self.es_client.index(
                        index='indian_judgments_index',
                        document=doc
                    )
                    indexed_count += 1
                except Exception as e:
                    logger.error(f"Error indexing case {case['case_title']}: {e}")
                    continue
            
            # Refresh index
            self.es_client.indices.refresh(index='indian_judgments_index')
            logger.info(f"Indexed {indexed_count} cases to Elasticsearch")
            return indexed_count
            
        except Exception as e:
            logger.error(f"Error indexing to Elasticsearch: {e}")
            return 0

    def run_daily_scraping(self):
        """Main method to run daily scraping"""
        logger.info("Starting daily scraping job...")
        start_time = time.time()
        
        try:
            all_cases = []
            
            # Scrape Supreme Court
            supreme_cases = self.scrape_supreme_court()
            all_cases.extend(supreme_cases)
            
            # Scrape High Courts
            for court_key, court_info in self.sources.items():
                if court_key != 'supreme_court':
                    high_court_cases = self.scrape_high_court(
                        court_info['name'], 
                        court_info['url']
                    )
                    all_cases.extend(high_court_cases)
            
            # Save to MongoDB
            saved_count = self.save_to_mongodb(all_cases)
            
            # Index to Elasticsearch
            if saved_count > 0:
                indexed_count = self.index_to_elasticsearch(all_cases)
                logger.info(f"Scraping completed: {saved_count} saved, {indexed_count} indexed")
            else:
                logger.info("Scraping completed: No new cases found")
            
            # Log execution time
            execution_time = time.time() - start_time
            logger.info(f"Daily scraping job completed in {execution_time:.2f} seconds")
            
        except Exception as e:
            logger.error(f"Error in daily scraping: {e}")

    def schedule_jobs(self):
        """Schedule scraping jobs"""
        # Schedule daily scraping at 6 AM
        schedule.every().day.at("06:00").do(self.run_daily_scraping)
        
        # Schedule weekly summary scraping on Sundays at 7 AM
        schedule.every().sunday.at("07:00").do(self.run_weekly_summary)
        
        logger.info("Scraping jobs scheduled:")
        logger.info("- Daily scraping: 6:00 AM")
        logger.info("- Weekly summary: Sunday 7:00 AM")
        
        # Run initial scraping if it's the first time
        if not self.db.judgments.find_one():
            logger.info("Running initial scraping...")
            self.run_daily_scraping()

    def run_weekly_summary(self):
        """Run weekly summary and cleanup"""
        logger.info("Starting weekly summary job...")
        
        try:
            # Generate summary statistics
            total_cases = self.db.judgments.count_documents({})
            recent_cases = self.db.judgments.count_documents({
                'scraped_at': {
                    '$gte': (datetime.now() - timedelta(days=7)).isoformat()
                }
            })
            
            # Log summary
            logger.info(f"Weekly Summary:")
            logger.info(f"- Total cases in database: {total_cases}")
            logger.info(f"- New cases this week: {recent_cases}")
            
            # Clean up old logs (keep last 30 days)
            cutoff_date = datetime.now() - timedelta(days=30)
            # This would clean up old log files if needed
            
        except Exception as e:
            logger.error(f"Error in weekly summary: {e}")

    def run_continuous(self):
        """Run the scraper continuously"""
        logger.info("Starting continuous scraper...")
        
        # Schedule jobs
        self.schedule_jobs()
        
        # Keep running
        while True:
            try:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
            except KeyboardInterrupt:
                logger.info("Scraper stopped by user")
                break
            except Exception as e:
                logger.error(f"Error in continuous run: {e}")
                time.sleep(300)  # Wait 5 minutes before retrying

def main():
    """Main function"""
    scraper = LegalCaseScraper()
    
    # Check command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == "run-once":
            # Run scraping once
            scraper.run_daily_scraping()
        elif sys.argv[1] == "continuous":
            # Run continuously
            scraper.run_continuous()
        else:
            print("Usage: python auto_scraper.py [run-once|continuous]")
            print("  run-once: Run scraping once and exit")
            print("  continuous: Run continuously with scheduling")
    else:
        # Default: run once
        scraper.run_daily_scraping()

if __name__ == "__main__":
    main()
