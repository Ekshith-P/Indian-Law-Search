#!/usr/bin/env python3
"""
Test script to verify all scrapers are working
"""

import requests
import json
import time

def test_scraper_endpoint(endpoint, name):
    """Test a scraper endpoint"""
    print(f"\n{'='*50}")
    print(f"Testing {name} Scraper")
    print(f"{'='*50}")
    
    try:
        # Test the scraper
        url = f"http://localhost:8000/scrape/{endpoint}?limit=1"
        print(f"Calling: {url}")
        
        response = requests.get(url, timeout=30)
        data = response.json()
        
        print(f"Status: {data.get('status', 'unknown')}")
        print(f"Found: {data.get('total_found', 0)} judgments")
        print(f"Inserted: {data.get('count', 0)} judgments")
        print(f"Message: {data.get('message', 'No message')}")
        
        if data.get('judgments'):
            judgment = data['judgments'][0]
            print(f"Sample judgment:")
            print(f"  - ID: {judgment.get('id', 'N/A')}")
            print(f"  - Title: {judgment.get('case_title', 'N/A')}")
            print(f"  - Court: {judgment.get('court', 'N/A')}")
            print(f"  - Date: {judgment.get('date', 'N/A')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing {name}: {e}")
        return False

def test_search_api(court_name):
    """Test search API for court data"""
    print(f"\n{'='*50}")
    print(f"Testing Search API for {court_name}")
    print(f"{'='*50}")
    
    try:
        url = f"http://localhost:3001/api/search?q={court_name}&limit=3"
        print(f"Calling: {url}")
        
        response = requests.get(url, timeout=10)
        data = response.json()
        
        print(f"Status: {data.get('status', 'unknown')}")
        print(f"Total results: {data.get('pagination', {}).get('total', 0)}")
        print(f"Query: {data.get('query', 'N/A')}")
        
        if data.get('results'):
            print(f"Sample results:")
            for i, result in enumerate(data['results'][:2]):
                print(f"  {i+1}. {result.get('case_title', 'N/A')} ({result.get('court', 'N/A')})")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing search for {court_name}: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing Indian Law Scrapers")
    print("="*60)
    
    # Test scraper endpoints
    scrapers = [
        ("sc", "Supreme Court"),
        ("dhc", "Delhi High Court"),
        ("bhc", "Bombay High Court")
    ]
    
    scraper_results = []
    for endpoint, name in scrapers:
        result = test_scraper_endpoint(endpoint, name)
        scraper_results.append(result)
        time.sleep(2)  # Wait between tests
    
    # Test search API
    search_results = []
    for endpoint, name in scrapers:
        if endpoint == "sc":
            search_term = "Supreme"
        elif endpoint == "dhc":
            search_term = "Delhi"
        elif endpoint == "bhc":
            search_term = "Bombay"
        
        result = test_search_api(search_term)
        search_results.append(result)
        time.sleep(1)
    
    # Summary
    print(f"\n{'='*60}")
    print("📊 TEST SUMMARY")
    print(f"{'='*60}")
    
    print(f"Scrapers Working: {sum(scraper_results)}/{len(scraper_results)}")
    print(f"Search APIs Working: {sum(search_results)}/{len(search_results)}")
    
    if all(scraper_results) and all(search_results):
        print("🎉 All tests passed! Scrapers are working correctly.")
    else:
        print("⚠️  Some tests failed. Check the logs above.")
    
    print(f"\n✅ Scraper Status:")
    for i, (endpoint, name) in enumerate(scrapers):
        status = "✅" if scraper_results[i] else "❌"
        print(f"  {status} {name}")
    
    print(f"\n✅ Search API Status:")
    for i, (endpoint, name) in enumerate(scrapers):
        status = "✅" if search_results[i] else "❌"
        print(f"  {status} {name} Search")

if __name__ == "__main__":
    main()
