const axios = require("axios");

class IndianKanoonAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = "https://api.indiankanoon.org";
    this.headers = {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    };
  }

  // Mock data for demonstration - replace with actual API calls
  async searchCases(query, limit = 10) {
    try {
      // For now, return mock data that simulates Indian Kanoon results
      // In production, this would be an actual API call
      console.log(`🔍 Mock Indian Kanoon search for: "${query}"`);

      const mockResults = this.generateMockResults(query, limit);
      return mockResults;
    } catch (error) {
      console.error("Indian Kanoon search error:", error.message);
      // Return empty results if API fails
      return [];
    }
  }

  // Generate mock results based on query
  generateMockResults(query, limit) {
    const mockCases = [
      {
        id: 1001,
        title: `Sample Case: ${query} - Fundamental Rights`,
        court: "Supreme Court of India",
        judges: ["Justice A.M. Khanwilkar", "Justice D.Y. Chandrachud"],
        date: "2023-06-15",
        citation: "(2023) 8 SCC 123",
        text: `This case deals with ${query} and its implications on fundamental rights. The court examined various aspects of the matter and provided comprehensive guidelines.`,
        summary: `Landmark judgment on ${query} and constitutional rights`,
        sections: ["Article 21", "Article 14", "Article 19"],
        tags: [query.toLowerCase(), "constitutional", "fundamental rights"],
        url: "https://indiankanoon.org/doc/1001/",
      },
      {
        id: 1002,
        title: `Recent Case: ${query} - Criminal Law`,
        court: "Delhi High Court",
        judges: ["Justice S. Muralidhar", "Justice I.S. Mehta"],
        date: "2023-05-20",
        citation: "2023 SCC OnLine Del 456",
        text: `The Delhi High Court examined the application of ${query} in criminal proceedings. The judgment provides important precedents for future cases.`,
        summary: `Important criminal law precedent on ${query}`,
        sections: ["IPC 302", "CrPC 41", "CrPC 438"],
        tags: [query.toLowerCase(), "criminal", "delhi high court"],
        url: "https://indiankanoon.org/doc/1002/",
      },
      {
        id: 1003,
        title: `${query} - Administrative Law`,
        court: "Bombay High Court",
        judges: ["Justice A.S. Oka", "Justice M.S. Sonak"],
        date: "2023-04-10",
        citation: "2023 SCC OnLine Bom 789",
        text: `Administrative law aspects of ${query} were examined in this case. The court provided guidelines for administrative authorities.`,
        summary: `Administrative law guidelines on ${query}`,
        sections: ["Article 226", "Article 227"],
        tags: [query.toLowerCase(), "administrative", "bombay high court"],
        url: "https://indiankanoon.org/doc/1003/",
      },
    ];

    // Filter and return results based on query relevance
    const relevantResults = mockCases.filter(
      (case_) =>
        case_.title.toLowerCase().includes(query.toLowerCase()) ||
        case_.tags.some((tag) => tag.includes(query.toLowerCase())) ||
        case_.sections.some((section) =>
          section.toLowerCase().includes(query.toLowerCase())
        )
    );

    return relevantResults.slice(0, limit);
  }

  // Get case details by ID
  async getCaseDetails(caseId) {
    try {
      console.log(`🔍 Mock Indian Kanoon case details for ID: ${caseId}`);

      // Return mock case details
      return {
        id: caseId,
        title: `Detailed Case: ${caseId}`,
        court: "Supreme Court of India",
        judges: ["Chief Justice of India"],
        date: "2023-01-01",
        citation: "(2023) 1 SCC 1",
        text: "This is a detailed mock case with comprehensive legal analysis...",
        summary: "Comprehensive legal analysis of the case",
        sections: ["Article 32", "Article 226"],
        tags: ["constitutional", "fundamental rights"],
        url: `https://indiankanoon.org/doc/${caseId}/`,
      };
    } catch (error) {
      console.error("Indian Kanoon case details error:", error.message);
      throw error;
    }
  }

  // Search by citation
  async searchByCitation(citation) {
    try {
      console.log(`🔍 Mock Indian Kanoon citation search: ${citation}`);

      return [
        {
          id: 2001,
          title: `Case with Citation: ${citation}`,
          court: "Supreme Court of India",
          citation: citation,
          date: "2023-03-01",
          summary: `Case found with citation ${citation}`,
          tags: ["citation", "supreme court"],
        },
      ];
    } catch (error) {
      console.error("Indian Kanoon citation search error:", error.message);
      return [];
    }
  }

  // Search by court
  async searchByCourt(court, limit = 10) {
    try {
      console.log(`🔍 Mock Indian Kanoon court search: ${court}`);

      return [
        {
          id: 3001,
          title: `Recent Case from ${court}`,
          court: court,
          date: "2023-07-01",
          summary: `Recent judgment from ${court}`,
          tags: [court.toLowerCase(), "recent"],
        },
      ];
    } catch (error) {
      console.error("Indian Kanoon court search error:", error.message);
      return [];
    }
  }

  // Search by date range
  async searchByDateRange(startDate, endDate, limit = 10) {
    try {
      console.log(
        `🔍 Mock Indian Kanoon date range search: ${startDate} to ${endDate}`
      );

      return [
        {
          id: 4001,
          title: `Case from Date Range`,
          court: "Supreme Court of India",
          date: startDate,
          summary: `Case from the specified date range`,
          tags: ["date range", "supreme court"],
        },
      ];
    } catch (error) {
      console.error("Indian Kanoon date range search error:", error.message);
      return [];
    }
  }

  // Get recent judgments
  async getRecentJudgments(limit = 10) {
    try {
      console.log(`🔍 Mock Indian Kanoon recent judgments`);

      const recentCases = [];
      for (let i = 0; i < Math.min(limit, 5); i++) {
        recentCases.push({
          id: 5000 + i,
          title: `Recent Judgment ${i + 1}`,
          court: "Supreme Court of India",
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          summary: `Recent judgment number ${i + 1}`,
          tags: ["recent", "supreme court"],
        });
      }

      return recentCases;
    } catch (error) {
      console.error("Indian Kanoon recent judgments error:", error.message);
      return [];
    }
  }

  // Search by judge
  async searchByJudge(judgeName, limit = 10) {
    try {
      console.log(`🔍 Mock Indian Kanoon judge search: ${judgeName}`);

      return [
        {
          id: 6001,
          title: `Case by Judge ${judgeName}`,
          court: "Supreme Court of India",
          judges: [judgeName],
          date: "2023-06-01",
          summary: `Case presided over by ${judgeName}`,
          tags: [judgeName.toLowerCase(), "judge"],
        },
      ];
    } catch (error) {
      console.error("Indian Kanoon judge search error:", error.message);
      return [];
    }
  }

  // Search by act/section
  async searchByAct(actName, section = null, limit = 10) {
    try {
      console.log(
        `🔍 Mock Indian Kanoon act search: ${actName}${
          section ? ` Section ${section}` : ""
        }`
      );

      return [
        {
          id: 7001,
          title: `Case under ${actName}${section ? ` Section ${section}` : ""}`,
          court: "Supreme Court of India",
          date: "2023-05-01",
          summary: `Case interpreting ${actName}${
            section ? ` Section ${section}` : ""
          }`,
          sections: section ? [section] : [actName],
          tags: [actName.toLowerCase(), "interpretation"],
        },
      ];
    } catch (error) {
      console.error("Indian Kanoon act search error:", error.message);
      return [];
    }
  }

  // Transform Indian Kanoon data to our format
  transformCaseData(kanoonData) {
    if (!kanoonData || !Array.isArray(kanoonData)) {
      return [];
    }

    return kanoonData.map((item) => ({
      id: `kanoon_${item.id || item.doc_id}`,
      case_title: item.title || item.case_title || "Untitled Case",
      court: item.court || "Unknown Court",
      judges: item.judges || [],
      date: item.date || item.judgment_date,
      citation: item.citation || "",
      text: item.text || item.content || "",
      summary: item.summary || item.headnote || "",
      referenced_sections: item.sections || [],
      tags: item.tags || [],
      source_url: item.url || item.source_url || "",
      source: "Indian Kanoon",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }

  // Enhanced search combining multiple sources
  async enhancedSearch(query, options = {}) {
    const {
      limit = 20,
      includeKanoon = true,
      includeLocal = true,
      court = null,
      dateFrom = null,
      dateTo = null,
    } = options;

    try {
      let results = [];

      // Search Indian Kanoon
      if (includeKanoon) {
        try {
          const kanoonResults = await this.searchCases(
            query,
            Math.floor(limit / 2)
          );
          const transformedResults = this.transformCaseData(kanoonResults);
          results.push(...transformedResults);
        } catch (error) {
          console.warn(
            "Indian Kanoon search failed, continuing with local search:",
            error.message
          );
        }
      }

      return {
        source: "Indian Kanoon",
        query: query,
        results: results,
        total: results.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Enhanced search failed:", error.message);
      throw error;
    }
  }
}

module.exports = IndianKanoonAPI;
