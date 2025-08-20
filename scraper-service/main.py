from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import logging

# Import the scrapers
from sc_scraper import SCJudgmentScraper
from dhc_scraper import DHCJudgmentScraper
from bhc_scraper import BHCJudgmentScraper

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Indian Law Scraper Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class ScrapeRequest(BaseModel):
    limit: Optional[int] = 5
    source: str = "sc"

class ScrapeResponse(BaseModel):
    status: str
    total_found: int
    inserted_count: int
    judgments: list
    message: str

@app.get("/health")
def health():
    return {"status": "ok", "service": "scraper-service"}

@app.get("/")
def root():
    return {"message": "Indian Law Scraper Service", "version": "1.0.0"}

@app.post("/scrape/sc", response_model=ScrapeResponse)
async def scrape_sc_judgments(request: ScrapeRequest):
    """Scrape Supreme Court judgments and save to MongoDB"""
    try:
        logger.info(f"Starting SC judgment scraping with limit: {request.limit}")
        
        # Initialize scraper
        scraper = SCJudgmentScraper()
        
        # Run scraping
        result = scraper.scrape_judgments(limit=request.limit)
        
        # Close connection
        scraper.close()
        
        return ScrapeResponse(
            status=result["status"],
            total_found=result["total_found"],
            inserted_count=result["inserted_count"],
            judgments=result["judgments"],
            message=f"Successfully scraped {result['inserted_count']} judgments"
        )
        
    except Exception as e:
        logger.error(f"Error in SC scraping: {e}")
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")

@app.get("/scrape/sc")
async def scrape_sc_get(limit: int = 5):
    """GET endpoint for SC scraping"""
    try:
        logger.info(f"Starting SC judgment scraping with limit: {limit}")
        
        # Initialize scraper
        scraper = SCJudgmentScraper()
        
        # Run scraping
        result = scraper.scrape_judgments(limit=limit)
        
        # Close connection
        scraper.close()
        
        return {
            "status": "ok",
            "count": result["inserted_count"],
            "total_found": result["total_found"],
            "judgments": result["judgments"],
            "message": f"Successfully scraped {result['inserted_count']} judgments"
        }
        
    except Exception as e:
        logger.error(f"Error in SC scraping: {e}")
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")

@app.post("/scrape/dhc", response_model=ScrapeResponse)
async def scrape_dhc_judgments(request: ScrapeRequest):
    """Scrape Delhi High Court judgments and save to MongoDB"""
    try:
        logger.info(f"Starting DHC judgment scraping with limit: {request.limit}")
        
        # Initialize scraper
        scraper = DHCJudgmentScraper()
        
        # Run scraping
        result = scraper.scrape_judgments(limit=request.limit)
        
        # Close connection
        scraper.close()
        
        return ScrapeResponse(
            status=result["status"],
            total_found=result["total_found"],
            inserted_count=result["inserted_count"],
            judgments=result["judgments"],
            message=f"Successfully scraped {result['inserted_count']} Delhi High Court judgments"
        )
        
    except Exception as e:
        logger.error(f"Error in DHC scraping: {e}")
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")

@app.get("/scrape/dhc")
async def scrape_dhc_get(limit: int = 5):
    """GET endpoint for Delhi High Court scraping"""
    try:
        logger.info(f"Starting DHC judgment scraping with limit: {limit}")
        
        # Initialize scraper
        scraper = DHCJudgmentScraper()
        
        # Run scraping
        result = scraper.scrape_judgments(limit=limit)
        
        # Close connection
        scraper.close()
        
        return {
            "status": "ok",
            "count": result["inserted_count"],
            "total_found": result["total_found"],
            "judgments": result["judgments"],
            "message": f"Successfully scraped {result['inserted_count']} Delhi High Court judgments"
        }
        
    except Exception as e:
        logger.error(f"Error in DHC scraping: {e}")
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")

@app.post("/scrape/bhc", response_model=ScrapeResponse)
async def scrape_bhc_judgments(request: ScrapeRequest):
    """Scrape Bombay High Court judgments and save to MongoDB"""
    try:
        logger.info(f"Starting BHC judgment scraping with limit: {request.limit}")
        
        # Initialize scraper
        scraper = BHCJudgmentScraper()
        
        # Run scraping
        result = scraper.scrape_judgments(limit=request.limit)
        
        # Close connection
        scraper.close()
        
        return ScrapeResponse(
            status=result["status"],
            total_found=result["total_found"],
            inserted_count=result["inserted_count"],
            judgments=result["judgments"],
            message=f"Successfully scraped {result['inserted_count']} Bombay High Court judgments"
        )
        
    except Exception as e:
        logger.error(f"Error in BHC scraping: {e}")
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")

@app.get("/scrape/bhc")
async def scrape_bhc_get(limit: int = 5):
    """GET endpoint for Bombay High Court scraping"""
    try:
        logger.info(f"Starting BHC judgment scraping with limit: {limit}")
        
        # Initialize scraper
        scraper = BHCJudgmentScraper()
        
        # Run scraping
        result = scraper.scrape_judgments(limit=limit)
        
        # Close connection
        scraper.close()
        
        return {
            "status": "ok",
            "count": result["inserted_count"],
            "total_found": result["total_found"],
            "judgments": result["judgments"],
            "message": f"Successfully scraped {result['inserted_count']} Bombay High Court judgments"
        }
        
    except Exception as e:
        logger.error(f"Error in BHC scraping: {e}")
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
