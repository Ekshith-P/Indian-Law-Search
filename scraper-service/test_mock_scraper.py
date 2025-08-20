#!/usr/bin/env python3
"""
Mock test script for SC Judgment Scraper - tests MongoDB functionality with sample data
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sc_scraper import SCJudgmentScraper
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_mock_judgment():
    """Create a mock judgment document for testing"""
    return {
        "id": "sc_arnesh_kumar_vs_state_of_bihar_2014",
        "case_title": "Arnesh Kumar vs State of Bihar & Anr",
        "court": "Supreme Court of India",
        "judges": ["Justice Chandramauli Kr. Prasad", "Justice Pinaki Chandra Ghose"],
        "date": "2014-07-02",
        "citation": "(2014) 8 SCC 273",
        "pdf_url": "https://main.sci.gov.in/judgments/arnesh_kumar.pdf",
        "text": """
        IN THE SUPREME COURT OF INDIA
        CRIMINAL APPELLATE JURISDICTION
        CRIMINAL APPEAL NO. 1277 OF 2014
        (Arising out of S.L.P. (Crl.) No. 9127 of 2013)
        
        Arnesh Kumar ... Appellant
        Versus
        State of Bihar & Anr. ... Respondents
        
        JUDGMENT
        Chandramauli Kr. Prasad, J.
        
        1. Leave granted.
        
        2. The appellant is aggrieved by the order dated 2nd of May, 2013 passed by the High Court of Judicature at Patna in Criminal Miscellaneous No. 33268 of 2013 whereby and whereunder the prayer for anticipatory bail made by the appellant has been rejected.
        
        3. The appellant is the husband of respondent No. 2. The marriage between the appellant and respondent No. 2 was solemnized on 1st of July, 2007. The respondent No. 2 filed a complaint under Section 498A of the Indian Penal Code (hereinafter referred to as the 'IPC') and Sections 3 and 4 of the Dowry Prohibition Act, 1961 (hereinafter referred to as the 'Act') against the appellant and his family members.
        
        4. The appellant apprehending arrest in connection with the aforesaid case filed an application for anticipatory bail before the High Court which has been rejected by the impugned order.
        
        5. The appellant is before us by way of this appeal.
        
        6. We have heard Mr. Ranjit Kumar, learned senior counsel for the appellant and Mr. Gopal Singh, learned counsel for the State of Bihar.
        
        7. The respondent No. 2 is not represented despite service of notice.
        
        8. The appellant is a government servant. The marriage between the appellant and respondent No. 2 was solemnized on 1st of July, 2007. The respondent No. 2 left the matrimonial home on 8th of April, 2008. The complaint was filed on 25th of July, 2008 i.e. after more than 15 months of leaving the matrimonial home.
        
        9. The appellant has been working as Assistant Professor in the Department of Computer Science and Engineering in the National Institute of Technology, Patna. He has no criminal antecedents.
        
        10. The appellant has been cooperating with the investigation and has appeared before the investigating officer on several occasions.
        
        11. In view of the aforesaid facts and circumstances, we are of the opinion that the appellant deserves to be granted anticipatory bail.
        
        12. Accordingly, we allow this appeal and direct that in the event of arrest, the appellant shall be released on bail on his furnishing a bond of Rs. 25,000/- (Rupees Twenty Five Thousand only) with two sureties of the like amount each to the satisfaction of the arresting officer/Investigating Officer/Superintendent of Police on the following conditions:
        
        (i) The appellant shall make himself available for interrogation by a police officer as and when required;
        
        (ii) The appellant shall not directly or indirectly make any inducement, threat or promise to any person acquainted with the facts of the case so as to dissuade him from disclosing such facts to the Court or to any police officer;
        
        (iii) The appellant shall not leave India without the previous permission of the Court;
        
        (iv) The appellant shall not tamper with the evidence or try to influence or contact the complainant, witnesses or any person concerned with the case.
        
        13. The appeal is allowed in the aforesaid terms.
        """,
        "summary": "Arrest guidelines under Section 498A IPC - Supreme Court grants anticipatory bail to husband in dowry harassment case, setting guidelines for arrest in such cases.",
        "referenced_sections": ["IPC 498A", "Dowry Prohibition Act 3", "Dowry Prohibition Act 4"],
        "source_url": "https://main.sci.gov.in/judgments/arnesh_kumar",
        "tags": ["criminal law", "anticipatory bail", "498A", "dowry harassment", "supreme court"],
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }

def test_mongodb_with_mock_data():
    """Test MongoDB functionality with mock data"""
    try:
        scraper = SCJudgmentScraper()
        
        # Create mock judgment
        mock_judgment = create_mock_judgment()
        
        # Save to MongoDB
        success = scraper.save_to_mongodb(mock_judgment)
        
        if success:
            logger.info("✅ Mock judgment saved to MongoDB successfully")
            
            # Verify it was saved
            saved_judgment = scraper.judgments.find_one({"id": mock_judgment["id"]})
            if saved_judgment:
                logger.info(f"✅ Retrieved judgment: {saved_judgment['case_title']}")
                logger.info(f"   - ID: {saved_judgment['id']}")
                logger.info(f"   - Court: {saved_judgment['court']}")
                logger.info(f"   - Date: {saved_judgment['date']}")
                logger.info(f"   - Judges: {saved_judgment['judges']}")
                logger.info(f"   - Tags: {saved_judgment['tags']}")
                
                # Test text search
                text_search = scraper.judgments.find({"text": {"$regex": "anticipatory bail", "$options": "i"}})
                text_count = len(list(text_search))
                logger.info(f"✅ Text search found {text_count} documents with 'anticipatory bail'")
                
                scraper.close()
                return True
            else:
                logger.error("❌ Mock judgment not found in MongoDB after saving")
                scraper.close()
                return False
        else:
            logger.error("❌ Failed to save mock judgment to MongoDB")
            scraper.close()
            return False
            
    except Exception as e:
        logger.error(f"❌ Mock data test failed: {e}")
        return False

def test_multiple_mock_judgments():
    """Test saving multiple mock judgments"""
    try:
        scraper = SCJudgmentScraper()
        
        # Create multiple mock judgments
        mock_judgments = [
            {
                "id": "sc_kesavananda_bharati_1973",
                "case_title": "Kesavananda Bharati vs State of Kerala",
                "court": "Supreme Court of India",
                "judges": ["Chief Justice S.M. Sikri", "Justice J.M. Shelat", "Justice K.S. Hegde"],
                "date": "1973-04-24",
                "citation": "(1973) 4 SCC 225",
                "pdf_url": "https://main.sci.gov.in/judgments/kesavananda.pdf",
                "text": "Basic structure doctrine case - Constitution cannot be amended to destroy its basic structure.",
                "summary": "Landmark case establishing the basic structure doctrine of the Indian Constitution.",
                "referenced_sections": ["Article 13", "Article 368"],
                "source_url": "https://main.sci.gov.in/judgments/kesavananda",
                "tags": ["constitutional law", "basic structure", "amendment", "supreme court"],
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            },
            {
                "id": "sc_maneka_gandhi_1978",
                "case_title": "Maneka Gandhi vs Union of India",
                "court": "Supreme Court of India",
                "judges": ["Chief Justice M.H. Beg", "Justice P.N. Bhagwati", "Justice Y.V. Chandrachud"],
                "date": "1978-01-25",
                "citation": "(1978) 1 SCC 248",
                "pdf_url": "https://main.sci.gov.in/judgments/maneka_gandhi.pdf",
                "text": "Right to life and personal liberty under Article 21 includes right to travel abroad.",
                "summary": "Expanded the scope of Article 21 to include various fundamental rights.",
                "referenced_sections": ["Article 21", "Article 14", "Article 19"],
                "source_url": "https://main.sci.gov.in/judgments/maneka_gandhi",
                "tags": ["constitutional law", "fundamental rights", "article 21", "supreme court"],
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
        ]
        
        inserted_count = 0
        for judgment in mock_judgments:
            if scraper.save_to_mongodb(judgment):
                inserted_count += 1
                logger.info(f"✅ Saved: {judgment['case_title']}")
        
        logger.info(f"✅ Successfully saved {inserted_count}/{len(mock_judgments)} mock judgments")
        
        # Verify total count
        total_count = scraper.judgments.count_documents({})
        logger.info(f"✅ Total judgments in MongoDB: {total_count}")
        
        scraper.close()
        return inserted_count == len(mock_judgments)
        
    except Exception as e:
        logger.error(f"❌ Multiple mock judgments test failed: {e}")
        return False

def main():
    """Run mock tests"""
    logger.info("🧪 Starting Mock SC Judgment Scraper Tests")
    logger.info("=" * 50)
    
    tests = [
        ("Single Mock Judgment Test", test_mongodb_with_mock_data),
        ("Multiple Mock Judgments Test", test_multiple_mock_judgments)
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
    logger.info(f"📊 Mock Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("🎉 All mock tests passed! MongoDB functionality is working correctly.")
    else:
        logger.error("⚠️  Some mock tests failed. Please check the logs above.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
