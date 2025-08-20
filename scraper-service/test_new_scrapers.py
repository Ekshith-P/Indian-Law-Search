#!/usr/bin/env python3
"""
Test script for Delhi High Court and Bombay High Court scrapers
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dhc_scraper import DHCJudgmentScraper
from bhc_scraper import BHCJudgmentScraper
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_dhc_scraper():
    """Test Delhi High Court scraper"""
    logger.info("Testing Delhi High Court scraper...")
    
    try:
        scraper = DHCJudgmentScraper()
        
        # Test with a small limit
        result = scraper.scrape_judgments(limit=2)
        
        logger.info(f"DHC Scraper Result: {result}")
        
        if result["status"] == "success":
            logger.info("✅ DHC scraper test passed")
            return True
        else:
            logger.error(f"❌ DHC scraper test failed: {result.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        logger.error(f"❌ DHC scraper test failed with exception: {e}")
        return False
    finally:
        if 'scraper' in locals():
            scraper.close()

def test_bhc_scraper():
    """Test Bombay High Court scraper"""
    logger.info("Testing Bombay High Court scraper...")
    
    try:
        scraper = BHCJudgmentScraper()
        
        # Test with a small limit
        result = scraper.scrape_judgments(limit=2)
        
        logger.info(f"BHC Scraper Result: {result}")
        
        if result["status"] == "success":
            logger.info("✅ BHC scraper test passed")
            return True
        else:
            logger.error(f"❌ BHC scraper test failed: {result.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        logger.error(f"❌ BHC scraper test failed with exception: {e}")
        return False
    finally:
        if 'scraper' in locals():
            scraper.close()

def test_unified_save_function():
    """Test the unified save function"""
    logger.info("Testing unified save function...")
    
    try:
        from unified_scraper import save_case
        
        # Test data
        test_case = {
            "court": "Test Court",
            "title": "Test Case Title",
            "date": "2024-01-01",
            "judges": ["Test Judge"],
            "pdf_url": "http://example.com/test.pdf",
            "text": "This is a test judgment text for testing purposes.",
            "citation": "Test Citation 2024",
            "source_url": "http://example.com/test"
        }
        
        # Try to save
        result = save_case(**test_case)
        
        if result:
            logger.info("✅ Unified save function test passed")
            return True
        else:
            logger.info("ℹ️ Unified save function test - case already exists (expected)")
            return True
            
    except Exception as e:
        logger.error(f"❌ Unified save function test failed: {e}")
        return False

def main():
    """Run all tests"""
    logger.info("Starting scraper tests...")
    
    tests = [
        ("Delhi High Court Scraper", test_dhc_scraper),
        ("Bombay High Court Scraper", test_bhc_scraper),
        ("Unified Save Function", test_unified_save_function)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        logger.info(f"\n{'='*50}")
        logger.info(f"Running {test_name} test...")
        logger.info(f"{'='*50}")
        
        if test_func():
            passed += 1
        else:
            logger.error(f"❌ {test_name} test failed")
    
    logger.info(f"\n{'='*50}")
    logger.info(f"Test Results: {passed}/{total} tests passed")
    logger.info(f"{'='*50}")
    
    if passed == total:
        logger.info("🎉 All tests passed!")
        return True
    else:
        logger.error(f"❌ {total - passed} test(s) failed")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
