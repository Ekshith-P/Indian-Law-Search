#!/usr/bin/env python3
"""
Test script for SC Judgment Scraper
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sc_scraper import SCJudgmentScraper
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_mongodb_connection():
    """Test MongoDB connection"""
    try:
        scraper = SCJudgmentScraper()
        # Test connection by trying to access the database
        db_info = scraper.db.command("ping")
        logger.info("✅ MongoDB connection successful")
        scraper.close()
        return True
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
        return False

def test_sc_website_access():
    """Test access to SC website"""
    try:
        scraper = SCJudgmentScraper()
        response = scraper.session.get(scraper.judgments_url, timeout=10)
        if response.status_code == 200:
            logger.info("✅ SC website accessible")
            return True
        else:
            logger.error(f"❌ SC website returned status code: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ SC website access failed: {e}")
        return False

def test_scraping_functionality():
    """Test the complete scraping functionality"""
    try:
        scraper = SCJudgmentScraper()
        
        # Test with a small limit
        logger.info("Testing SC judgment scraping...")
        result = scraper.scrape_judgments(limit=2)
        
        logger.info(f"✅ Scraping test completed:")
        logger.info(f"   - Total found: {result['total_found']}")
        logger.info(f"   - Inserted: {result['inserted_count']}")
        logger.info(f"   - Judgment IDs: {result['judgments']}")
        
        scraper.close()
        return result['inserted_count'] > 0
        
    except Exception as e:
        logger.error(f"❌ Scraping test failed: {e}")
        return False

def verify_mongodb_data():
    """Verify that data was actually saved to MongoDB"""
    try:
        scraper = SCJudgmentScraper()
        
        # Count documents in judgments collection
        count = scraper.judgments.count_documents({})
        logger.info(f"✅ MongoDB contains {count} judgment documents")
        
        if count > 0:
            # Show sample document
            sample = scraper.judgments.find_one()
            logger.info(f"Sample judgment: {sample.get('case_title', 'Unknown')}")
            logger.info(f"ID: {sample.get('id', 'Unknown')}")
            logger.info(f"Court: {sample.get('court', 'Unknown')}")
            logger.info(f"Date: {sample.get('date', 'Unknown')}")
        
        scraper.close()
        return count > 0
        
    except Exception as e:
        logger.error(f"❌ MongoDB data verification failed: {e}")
        return False

def main():
    """Run all tests"""
    logger.info("🧪 Starting SC Judgment Scraper Tests")
    logger.info("=" * 50)
    
    tests = [
        ("MongoDB Connection", test_mongodb_connection),
        ("SC Website Access", test_sc_website_access),
        ("Scraping Functionality", test_scraping_functionality),
        ("MongoDB Data Verification", verify_mongodb_data)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        logger.info(f"\n🔍 Running: {test_name}")
        try:
            if test_func():
                logger.info(f"✅ {test_name}: PASSED")
                passed += 1
            else:
                logger.error(f"❌ {test_name}: FAILED")
        except Exception as e:
            logger.error(f"❌ {test_name}: ERROR - {e}")
    
    logger.info("\n" + "=" * 50)
    logger.info(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("🎉 All tests passed! The scraper is working correctly.")
    else:
        logger.error("⚠️  Some tests failed. Please check the logs above.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
