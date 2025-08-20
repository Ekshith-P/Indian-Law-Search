import logging
from typing import Dict, List, Optional
from datetime import datetime
from pymongo import MongoClient

logger = logging.getLogger(__name__)

def save_case(court: str, title: str, date: str, judges: List[str], pdf_url: str, 
              text: str, citation: str = None, source_url: str = None, 
              mongo_uri: str = "mongodb://admin:password@localhost:27018/indian_law_db?authSource=admin") -> bool:
    """
    Unified function to save case data to MongoDB
    
    Args:
        court: Name of the court (e.g., "Supreme Court of India", "Delhi High Court")
        title: Case title
        date: Judgment date
        judges: List of judge names
        pdf_url: URL to the PDF file
        text: Extracted text from PDF
        citation: Case citation (optional)
        source_url: Source URL of the judgment page (optional)
        mongo_uri: MongoDB connection string
    
    Returns:
        bool: True if saved successfully, False otherwise
    """
    try:
        # Connect to MongoDB
        client = MongoClient(mongo_uri)
        db = client["indian_law_db"]
        judgments = db["judgments"]
        
        # Generate unique ID
        import re
        clean_title = re.sub(r'[^a-zA-Z0-9\s]', '', title)
        words = clean_title.split()[:3]
        id_suffix = '_'.join(words).lower()
        clean_date = re.sub(r'[^0-9]', '', date)[:8]
        
        court_prefix = {
            "Supreme Court of India": "sc",
            "Delhi High Court": "dhc", 
            "Bombay High Court": "bhc"
        }.get(court, "court")
        
        judgment_id = f"{court_prefix}_{id_suffix}_{clean_date}"
        
        # Check if judgment already exists
        existing = judgments.find_one({"id": judgment_id})
        if existing:
            logger.info(f"Judgment {judgment_id} already exists, skipping")
            client.close()
            return False
        
        # Create judgment document
        case = {
            "id": judgment_id,
            "case_title": title,
            "court": court,
            "judges": judges,
            "date": date,
            "citation": citation or "",
            "pdf_url": pdf_url,
            "text": text,
            "summary": generate_summary(text),
            "referenced_sections": extract_referenced_sections(text),
            "tags": generate_tags(title, text),
            "source_url": source_url or "",
            "scraped_at": datetime.now().isoformat()
        }
        
        # Insert into MongoDB
        result = judgments.insert_one(case)
        logger.info(f"Saved judgment {judgment_id} with MongoDB ID: {result.inserted_id}")
        
        client.close()
        return True
        
    except Exception as e:
        logger.error(f"Error saving case to MongoDB: {e}")
        return False

def generate_summary(text: str) -> str:
    """Generate summary from judgment text"""
    if not text:
        return "Judgment summary"
    
    # Take first 200 characters as summary
    summary = text[:200].strip()
    if len(text) > 200:
        summary += "..."
    
    return summary

def extract_referenced_sections(text: str) -> List[str]:
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
        import re
        matches = re.findall(pattern, text, re.IGNORECASE)
        sections.extend(matches)
    
    return list(set(sections))

def generate_tags(title: str, text: str) -> List[str]:
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
