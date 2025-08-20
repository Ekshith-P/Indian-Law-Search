const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const IndianKanoonAPI = require("./indian-kanoon-api");
const IssueBasedSearch = require("./issue-based-search");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

// Elasticsearch connection (optional)
let es = null;
try {
  const { Client } = require("@elastic/elasticsearch");
  es = new Client({
    node: "http://localhost:9201",
    auth: {
      username: "elastic",
      password: "changeme",
    },
  });
} catch (error) {
  console.log("Elasticsearch not available, using external sources only");
}

// Indian Kanoon API
const INDIAN_KANOON_API_KEY = "dccba2fb72d53cfef3032bf421f36cdce867b409";
const kanoonAPI = new IndianKanoonAPI(INDIAN_KANOON_API_KEY);

// Issue-Based Search System
const issueBasedSearch = new IssueBasedSearch();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "backend-apis",
    timestamp: new Date().toISOString(),
    features: {
      elasticsearch: es ? "✅" : "❌",
      external_sources: "✅",
      indian_kanoon: "✅",
      summarization: "✅",
      auto_scraping: "✅",
      issue_based_search: "✅",
    },
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Indian Law Search Backend APIs",
    version: "1.0.0",
    features: {
      external_sources: "Comprehensive legal databases and sources",
      indian_kanoon: "External legal database integration",
      summarization: "AI-powered case summarization",
      auto_scraping: "Automated case collection",
      issue_based_search: "Comprehensive legal issue search across all courts",
    },
    endpoints: {
      health: "/health",
      issue_search: "/api/issue-search",
      kanoon_search: "/api/kanoon/search",
      kanoon_cases: "/api/kanoon/cases",
      summarize: "/api/summarize",
      scraper: "/api/scraper/run",
    },
  });
});

// NEW: Issue-Based Search Endpoint - Main feature for comprehensive legal issue search
app.get("/api/issue-search", async (req, res) => {
  try {
    const {
      q: query,
      limit = 50,
      include_legislation = "true",
      include_judgments = "true",
      include_kanoon = "true",
      court_filter,
      date_from,
      date_to,
      issue_type,
    } = req.query;

    if (!query) {
      return res.status(400).json({
        error: "Query parameter 'q' is required",
        example:
          "Try searching for: 'anticipatory bail', 'domestic violence', 'property rights'",
      });
    }

    console.log(`🔍 Issue-based search for: "${query}"`);

    const searchOptions = {
      limit: parseInt(limit),
      includeLegislation: include_legislation === "true",
      includeJudgments: include_judgments === "true",
      includeKanoon: include_kanoon === "true",
      courtFilter: court_filter || null,
      dateFrom: date_from || null,
      dateTo: date_to || null,
      issueType: issue_type || null,
    };

    const results = await issueBasedSearch.searchByIssue(query, searchOptions);

    res.json({
      status: "success",
      message: `Comprehensive search for legal issue: "${query}"`,
      ...results,
      search_tips: [
        "Results are categorized by legislation, judgments, and external sources",
        "Use court_filter to focus on specific courts",
        "Check related_issues for broader legal context",
        "View courts_coverage to see jurisdictional spread",
      ],
    });
  } catch (error) {
    console.error("Issue-based search error:", error);
    res.status(500).json({
      error: "Issue-based search failed",
      details: error.message,
      suggestion:
        "Try a simpler query or check if the search system is running",
    });
  }
});

// NEW: Get full judgment text endpoint
app.get("/api/full-judgment/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { source } = req.query;

    if (!id) {
      return res.status(400).json({
        error: "Judgment ID is required",
      });
    }

    console.log(`📄 Fetching full judgment text for: ${id}`);

    const fullJudgment = await issueBasedSearch.getFullJudgmentText(id, source);

    res.json({
      status: "success",
      message: "Full judgment text retrieved",
      judgment: fullJudgment,
    });
  } catch (error) {
    console.error("Full judgment fetch error:", error);
    res.status(500).json({
      error: "Failed to fetch full judgment text",
      details: error.message,
    });
  }
});

// NEW: Indian Kanoon search endpoint
app.get("/api/kanoon-search/:query", async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 10, type = "judgments" } = req.query;

    if (!query) {
      return res.status(400).json({
        error: "Search query is required",
      });
    }

    console.log(`🔍 Indian Kanoon search for: "${query}"`);

    const kanoonResults = await issueBasedSearch.searchKanoon(
      query,
      parseInt(limit)
    );

    res.json({
      status: "success",
      message: `Indian Kanoon search results for: "${query}"`,
      query: query,
      results: kanoonResults,
      total: kanoonResults.length,
      search_type: type,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Indian Kanoon search error:", error);
    res.status(500).json({
      error: "Indian Kanoon search failed",
      details: error.message,
    });
  }
});

// Summarization endpoint
app.post("/api/summarize", async (req, res) => {
  try {
    const { text, case_title, method = "hybrid", max_sentences = 4 } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text content is required" });
    }

    // Call Python summarizer
    const summary = await callPythonSummarizer(
      text,
      case_title,
      method,
      max_sentences
    );

    res.json({
      status: "success",
      summary: summary,
      metadata: {
        original_length: text.length,
        summary_length: summary.length,
        method: method,
        max_sentences: max_sentences,
        compression_ratio:
          ((summary.length / text.length) * 100).toFixed(2) + "%",
      },
    });
  } catch (error) {
    console.error("Summarization error:", error);
    res
      .status(500)
      .json({ error: "Summarization failed", details: error.message });
  }
});

// Function to call Python summarizer
async function callPythonSummarizer(text, case_title, method, max_sentences) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, "summarizer.py");

    const pythonProcess = spawn("python3", [
      pythonScript,
      "--text",
      text,
      "--title",
      case_title || "",
      "--method",
      method,
      "--max_sentences",
      max_sentences.toString(),
    ]);

    let result = "";
    let error = "";

    pythonProcess.stdout.on("data", (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      error += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed with code ${code}: ${error}`));
      } else {
        try {
          // Parse the result (assuming JSON output)
          const parsed = JSON.parse(result);
          resolve(parsed.summary || result);
        } catch (e) {
          // If not JSON, return raw result
          resolve(result.trim());
        }
      }
    });

    pythonProcess.on("error", (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

// Auto scraper endpoint
app.post("/api/scraper/run", async (req, res) => {
  try {
    const { mode = "run-once" } = req.body;

    // Call Python scraper
    const result = await callPythonScraper(mode);

    res.json({
      status: "success",
      message: `Scraper started in ${mode} mode`,
      result: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Scraper error:", error);
    res.status(500).json({ error: "Scraper failed", details: error.message });
  }
});

// Function to call Python scraper
async function callPythonScraper(mode) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, "auto_scraper.py");

    const pythonProcess = spawn("python3", [pythonScript, mode]);

    let result = "";
    let error = "";

    pythonProcess.stdout.on("data", (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      error += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python scraper failed with code ${code}: ${error}`));
      } else {
        resolve(result.trim());
      }
    });

    pythonProcess.on("error", (err) => {
      reject(new Error(`Failed to start Python scraper: ${err.message}`));
    });
  });
}

// Indian Kanoon specific endpoints
app.get("/api/kanoon/search", async (req, res) => {
  try {
    const { q: query, limit = 10, court, date_from, date_to } = req.query;

    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const options = {
      limit: parseInt(limit),
      includeKanoon: true,
      court: court,
      dateFrom: date_from,
      dateTo: date_to,
    };

    const results = await kanoonAPI.enhancedSearch(query, options);
    res.json(results);
  } catch (error) {
    console.error("Indian Kanoon search error:", error);
    res
      .status(500)
      .json({ error: "Indian Kanoon search failed", details: error.message });
  }
});

app.get("/api/kanoon/cases", async (req, res) => {
  try {
    const { citation, court, judge, act, section, limit = 10 } = req.query;

    let results = [];

    if (citation) {
      results = await kanoonAPI.searchByCitation(citation);
    } else if (court) {
      results = await kanoonAPI.searchByCourt(court, parseInt(limit));
    } else if (judge) {
      results = await kanoonAPI.searchByJudge(judge, parseInt(limit));
    } else if (act) {
      results = await kanoonAPI.searchByAct(act, section, parseInt(limit));
    } else {
      results = await kanoonAPI.getRecentJudgments(parseInt(limit));
    }

    const transformedResults = kanoonAPI.transformCaseData(results);

    res.json({
      status: "success",
      query: { citation, court, judge, act, section },
      results: transformedResults,
      total: transformedResults.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Indian Kanoon cases error:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch cases", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend APIs running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(
    `🎯 ISSUE-BASED SEARCH: http://localhost:${PORT}/api/issue-search`
  );
  console.log(
    `📄 FULL JUDGMENT: http://localhost:${PORT}/api/full-judgment/:id`
  );
  console.log(
    `🔍 KANOON SEARCH: http://localhost:${PORT}/api/kanoon-search/:query`
  );
  console.log(`Summarization: http://localhost:${PORT}/api/summarize`);
  console.log(`Auto scraper: http://localhost:${PORT}/api/scraper/run`);
  console.log(`Indian Kanoon integration: ✅ Active`);
  console.log(`AI Summarization: ✅ Active`);
  console.log(`Auto Scraping: ✅ Active`);
  console.log(
    `🎯 Issue-Based Search: ✅ Active - Comprehensive legal issue search across all courts!`
  );
  console.log(`📚 External Sources: ✅ Active - No local database dependency`);
  console.log(
    `📄 Embedded Full Text: ✅ Active - View complete judgments on our site!`
  );
});
