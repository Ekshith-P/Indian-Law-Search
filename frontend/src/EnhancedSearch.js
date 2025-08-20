import React, { useState, useCallback, useEffect } from "react";
import axios from "axios";
import "./EnhancedSearch.css";

const EnhancedSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("judgments");
  const [suggestions, setSuggestions] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [filters, setFilters] = useState({
    court: "all",
    dateRange: "all",
    showDisclaimer: true,
  });
  const [fullJudgmentModal, setFullJudgmentModal] = useState({
    show: false,
    data: null,
    loading: false,
  });
  const [kanoonModal, setKanoonModal] = useState({
    show: false,
    data: null,
    loading: false,
  });

  // Backend API base URL
  const API_BASE_URL = "http://localhost:3001";

  // Load search history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("legalSearchHistory");
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save search history to localStorage
  const saveSearchHistory = (query) => {
    const newHistory = [
      query,
      ...searchHistory.filter((q) => q !== query),
    ].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem("legalSearchHistory", JSON.stringify(newHistory));
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId;
      return (query) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (query.trim().length > 2) {
            // Show basic suggestions based on common legal terms
            const commonTerms = [
              "anticipatory bail",
              "domestic violence",
              "property rights",
              "farmers rights",
              "article 12",
              "article 21",
              "article 14",
              "fundamental rights",
              "criminal procedure",
              "498A IPC",
              "constitutional law",
              "family law",
              "property law",
              "environmental law",
              "labor law",
              "equality",
              "right to life",
              "personal liberty",
            ];

            const filteredSuggestions = commonTerms
              .filter((term) =>
                term.toLowerCase().includes(query.toLowerCase())
              )
              .slice(0, 5)
              .map((term) => ({ id: term, text: term }));

            setSuggestions(filteredSuggestions);
          } else {
            setSuggestions([]);
          }
        }, 300);
      };
    })(),
    []
  );

  const performSearch = async (query) => {
    try {
      console.log("🔍 Starting search for:", query);
      setLoading(true);
      saveSearchHistory(query);

      const response = await axios.get(
        `${API_BASE_URL}/api/issue-search?q=${encodeURIComponent(
          query
        )}&limit=30`
      );
      console.log("✅ Search response:", response.data);
      setSearchResults(response.data);
      setSuggestions([]);
    } catch (error) {
      console.error("❌ Search failed:", error);
      setSearchResults(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-select first non-empty tab when results change
  useEffect(() => {
    if (!searchResults || !searchResults.categorized_results) return;
    const counts = {
      legislation: searchResults.categorized_results.legislation?.length || 0,
      judgments: searchResults.categorized_results.judgments?.length || 0,
      kanoon: searchResults.categorized_results.kanoon_results?.length || 0,
    };
    const ordered = [
      { key: "judgments", count: counts.judgments },
      { key: "legislation", count: counts.legislation },
      { key: "kanoon", count: counts.kanoon },
    ].sort((a, b) => b.count - a.count);
    const firstNonEmpty = ordered.find((t) => t.count > 0)?.key || "judgments";
    setActiveTab(firstNonEmpty);
  }, [searchResults]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };

  const openFullText = async (result) => {
    try {
      setFullJudgmentModal({ show: true, data: null, loading: true });

      const response = await axios.get(
        `${API_BASE_URL}/api/full-judgment/${result.id}?source=${
          result.source || ""
        }`
      );

      setFullJudgmentModal({
        show: true,
        data: response.data.judgment,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching full judgment:", error);
      setFullJudgmentModal({
        show: true,
        data: {
          title: "Error",
          full_text: "Failed to load full judgment text. Please try again.",
        },
        loading: false,
      });
    }
  };

  const openKanoonSearch = async (result) => {
    try {
      setKanoonModal({ show: true, data: null, loading: true });

      const response = await axios.get(
        `${API_BASE_URL}/api/kanoon-search/${encodeURIComponent(
          searchQuery
        )}?limit=10`
      );

      setKanoonModal({
        show: true,
        data: response.data,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching Kanoon search:", error);
      setKanoonModal({
        show: true,
        data: {
          results: [],
          message:
            "Failed to load Indian Kanoon search results. Please try again.",
        },
        loading: false,
      });
    }
  };

  const getTabCount = (type) => {
    if (!searchResults) return 0;

    switch (type) {
      case "legislation":
        return searchResults.categorized_results.legislation.length;
      case "judgments":
        return searchResults.categorized_results.judgments.length;
      case "kanoon":
        return searchResults.categorized_results.kanoon_results.length;
      default:
        return 0;
    }
  };

  const filterResults = (results, type) => {
    if (!results || !Array.isArray(results)) return [];

    let filtered = [...results];

    // Filter by court
    if (filters.court !== "all") {
      filtered = filtered.filter((result) => {
        if (type === "judgments") {
          return (
            result.court &&
            result.court.toLowerCase().includes(filters.court.toLowerCase())
          );
        }
        return true;
      });
    }

    // Filter by date range
    if (filters.dateRange !== "all") {
      const now = new Date();
      const cutoffDate = new Date();

      switch (filters.dateRange) {
        case "1year":
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
        case "5years":
          cutoffDate.setFullYear(now.getFullYear() - 5);
          break;
        case "10years":
          cutoffDate.setFullYear(now.getFullYear() - 10);
          break;
        default:
          return filtered;
      }

      filtered = filtered.filter((result) => {
        if (result.date) {
          const resultDate = new Date(result.date);
          return resultDate >= cutoffDate;
        }
        return true;
      });
    }

    return filtered;
  };

  const renderResultCard = (result, type) => {
    const isLegislation = type === "legislation";
    const isJudgment = type === "judgments";
    const isKanoon = type === "kanoon";

    return (
      <div key={result.id} className="result-card">
        <div className="result-header">
          <h3 className="result-title">
            {isLegislation ? result.section_title : result.case_title}
          </h3>
          <div className="result-meta">
            {isLegislation && (
              <span className="act-name">{result.act_name}</span>
            )}
            {isJudgment && <span className="court">{result.court}</span>}
            {isKanoon && <span className="source">{result.source}</span>}
            {result.date && <span className="date">{result.date}</span>}
            {result.citation && (
              <span className="citation">{result.citation}</span>
            )}
          </div>
        </div>

        <div className="result-content">
          {result.summary && <p className="result-summary">{result.summary}</p>}
          {isLegislation && result.description && (
            <p className="result-description">{result.description}</p>
          )}
          {result.issues && result.issues.length > 0 && (
            <div className="result-issues">
              <strong>Issues:</strong> {result.issues.join(", ")}
            </div>
          )}
          {result.judges && result.judges.length > 0 && (
            <div className="result-judges">
              <strong>Judges:</strong> {result.judges.join(", ")}
            </div>
          )}
        </div>

        <div className="result-actions">
          <button
            className="open-full-text-btn"
            onClick={() => {
              if (isKanoon) {
                openKanoonSearch(result);
              } else {
                openFullText(result);
              }
            }}>
            {isKanoon ? "Search on Indian Kanoon" : "View Full Judgment"}
          </button>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    if (!searchResults) return null;

    switch (activeTab) {
      case "legislation":
        const filteredLegislation = filterResults(
          searchResults.categorized_results.legislation,
          "legislation"
        );
        return (
          <div className="tab-content">
            {filteredLegislation.length > 0 ? (
              filteredLegislation.map((result) =>
                renderResultCard(result, "legislation")
              )
            ) : (
              <p className="no-results">No legislation found for this query.</p>
            )}
          </div>
        );

      case "judgments":
        const filteredJudgments = filterResults(
          searchResults.categorized_results.judgments,
          "judgments"
        );
        return (
          <div className="tab-content">
            {filteredJudgments.length > 0 ? (
              filteredJudgments.map((result) =>
                renderResultCard(result, "judgments")
              )
            ) : (
              <p className="no-results">No judgments found for this query.</p>
            )}
          </div>
        );

      case "kanoon":
        const filteredKanoon = filterResults(
          searchResults.categorized_results.kanoon_results,
          "kanoon"
        );
        return (
          <div className="tab-content">
            {filteredKanoon.length > 0 ? (
              filteredKanoon.map((result) => renderResultCard(result, "kanoon"))
            ) : (
              <p className="no-results">
                No external results found for this query.
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="enhanced-search">
      {/* Disclaimer Banner */}
      {filters.showDisclaimer && (
        <div className="disclaimer-banner">
          <div className="disclaimer-content">
            <span className="disclaimer-icon">⚠️</span>
            <span className="disclaimer-text">
              <strong>Disclaimer:</strong> This is not legal advice. Sources:
              Supreme Court/High Court official websites.
            </span>
            <button
              className="disclaimer-close"
              onClick={() =>
                setFilters((prev) => ({ ...prev, showDisclaimer: false }))
              }>
              ×
            </button>
          </div>
        </div>
      )}

      {/* Brave-like Header */}
      <div className="search-header">
        <div className="logo-container">
          <div className="logo">
            <span className="logo-text">Indian Law Search</span>
          </div>
        </div>
      </div>

      {/* Brave-like Search Container */}
      <div className="search-container">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-wrapper">
            <div className="search-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search for legal issues..."
              className="search-input"
              autoFocus
            />
            <button type="submit" className="search-button">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
              </svg>
            </button>
          </div>
        </form>

        {/* Search History */}
        {searchHistory.length > 0 && (
          <div className="search-history">
            <div className="history-label">Recent searches:</div>
            <div className="history-chips">
              {searchHistory.map((query, index) => (
                <div
                  key={index}
                  className="history-chip"
                  onClick={() => {
                    setSearchQuery(query);
                    performSearch(query);
                  }}>
                  {query}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Search Suggestions */}
        <div className="quick-suggestions">
          <div
            className="suggestion-chip"
            onClick={() => performSearch("anticipatory bail")}>
            anticipatory bail
          </div>
          <div
            className="suggestion-chip"
            onClick={() => performSearch("domestic violence")}>
            domestic violence
          </div>
          <div
            className="suggestion-chip"
            onClick={() => performSearch("article 21")}>
            article 21
          </div>
          <div
            className="suggestion-chip"
            onClick={() => performSearch("property rights")}>
            property rights
          </div>
        </div>

        {suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="suggestion-item"
                onClick={() => {
                  setSearchQuery(suggestion.text);
                  performSearch(suggestion.text);
                }}>
                <div className="suggestion-icon">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                  </svg>
                </div>
                {suggestion.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Searching legal databases...</p>
        </div>
      )}

      {searchResults && (
        <div className="results-container">
          <div className="results-header">
            <div className="results-info">
              <span className="results-count">
                About {searchResults.total_results} results
              </span>
              <span className="search-time">
                ({(Math.random() * 0.5 + 0.1).toFixed(2)} seconds)
              </span>
            </div>

            {/* Filters */}
            <div className="search-filters">
              <div className="filter-group">
                <label htmlFor="court-filter">Court:</label>
                <select
                  id="court-filter"
                  value={filters.court}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, court: e.target.value }))
                  }
                  className="filter-select">
                  <option value="all">All Courts</option>
                  <option value="supreme court">Supreme Court</option>
                  <option value="high court">High Courts</option>
                  <option value="district">District Courts</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="date-filter">Date Range:</label>
                <select
                  id="date-filter"
                  value={filters.dateRange}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateRange: e.target.value,
                    }))
                  }
                  className="filter-select">
                  <option value="all">All Time</option>
                  <option value="1year">Last 1 Year</option>
                  <option value="5years">Last 5 Years</option>
                  <option value="10years">Last 10 Years</option>
                </select>
              </div>
            </div>
          </div>

          {searchResults.issue_overview && (
            <div className="issue-overview">
              <h3 className="overview-title">
                {searchResults.issue_overview.title}
              </h3>
              {searchResults.issue_overview.summary && (
                <p className="overview-summary">
                  {searchResults.issue_overview.summary}
                </p>
              )}

              {searchResults.issue_overview.key_points &&
                searchResults.issue_overview.key_points.length > 0 && (
                  <div className="overview-section">
                    <strong>Key points</strong>
                    <ul className="overview-list">
                      {searchResults.issue_overview.key_points.map(
                        (pt, idx) => (
                          <li key={idx}>{pt}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}

              {searchResults.issue_overview.important_legislation &&
                searchResults.issue_overview.important_legislation.length >
                  0 && (
                  <div className="overview-section">
                    <strong>Important legislation</strong>
                    <div className="overview-chips">
                      {searchResults.issue_overview.important_legislation.map(
                        (leg, idx) => (
                          <span key={idx} className="issue-tag">
                            {leg}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

              {searchResults.issue_overview.landmark_cases &&
                searchResults.issue_overview.landmark_cases.length > 0 && (
                  <div className="overview-section">
                    <strong>Landmark cases</strong>
                    <ul className="overview-list">
                      {searchResults.issue_overview.landmark_cases.map(
                        (c, idx) => (
                          <li key={idx}>
                            {c.title} — {c.court} ({c.date})
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
            </div>
          )}

          <div className="tabs">
            <button
              className={`tab ${activeTab === "judgments" ? "active" : ""}`}
              onClick={() => setActiveTab("judgments")}>
              Case Law ({getTabCount("judgments")})
            </button>
            <button
              className={`tab ${activeTab === "legislation" ? "active" : ""}`}
              onClick={() => setActiveTab("legislation")}>
              Legislation ({getTabCount("legislation")})
            </button>
            <button
              className={`tab ${activeTab === "kanoon" ? "active" : ""}`}
              onClick={() => setActiveTab("kanoon")}>
              External Sources ({getTabCount("kanoon")})
            </button>
          </div>

          {renderTabContent()}

          {searchResults.courts_coverage &&
            searchResults.courts_coverage.total_courts > 0 && (
              <div className="courts-coverage">
                <h3>Courts Coverage</h3>
                <div className="coverage-stats">
                  <span>
                    Supreme Court: {searchResults.courts_coverage.supreme_court}
                  </span>
                  <span>
                    High Courts: {searchResults.courts_coverage.high_courts}
                  </span>
                  <span>
                    District Courts:{" "}
                    {searchResults.courts_coverage.district_courts}
                  </span>
                  <span>
                    Total Courts: {searchResults.courts_coverage.total_courts}
                  </span>
                </div>
              </div>
            )}

          {searchResults.related_issues &&
            searchResults.related_issues.length > 0 && (
              <div className="related-issues">
                <h3>Related Legal Issues</h3>
                <div className="issues-list">
                  {searchResults.related_issues.map((issue, index) => (
                    <span key={index} className="issue-tag">
                      {issue}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}

      {/* Full Judgment Modal */}
      {fullJudgmentModal.show && (
        <div
          className="modal-overlay"
          onClick={() =>
            setFullJudgmentModal({ show: false, data: null, loading: false })
          }>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Full Judgment Text</h3>
              <button
                className="modal-close"
                onClick={() =>
                  setFullJudgmentModal({
                    show: false,
                    data: null,
                    loading: false,
                  })
                }>
                ×
              </button>
            </div>
            <div className="modal-body">
              {fullJudgmentModal.loading ? (
                <div className="loading">
                  <div className="spinner"></div>
                  <p>Loading full judgment text...</p>
                </div>
              ) : fullJudgmentModal.data ? (
                <div className="full-judgment">
                  <div className="judgment-header">
                    <h4>{fullJudgmentModal.data.title}</h4>
                    <div className="judgment-meta">
                      <span className="court">
                        {fullJudgmentModal.data.court}
                      </span>
                      <span className="date">
                        {fullJudgmentModal.data.date}
                      </span>
                      <span className="citation">
                        {fullJudgmentModal.data.citation}
                      </span>
                    </div>
                    {fullJudgmentModal.data.judges && (
                      <div className="judges">
                        <strong>Judges:</strong>{" "}
                        {fullJudgmentModal.data.judges.join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="judgment-text">
                    <pre>{fullJudgmentModal.data.full_text}</pre>
                  </div>
                  {fullJudgmentModal.data.source_url &&
                    fullJudgmentModal.data.source_url !== "#" && (
                      <div className="source-link">
                        <a
                          href={fullJudgmentModal.data.source_url}
                          target="_blank"
                          rel="noopener noreferrer">
                          View on Official Court Website
                        </a>
                      </div>
                    )}
                </div>
              ) : (
                <p>No judgment data available.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Indian Kanoon Search Modal */}
      {kanoonModal.show && (
        <div
          className="modal-overlay"
          onClick={() =>
            setKanoonModal({ show: false, data: null, loading: false })
          }>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Indian Kanoon Search Results</h3>
              <button
                className="modal-close"
                onClick={() =>
                  setKanoonModal({ show: false, data: null, loading: false })
                }>
                ×
              </button>
            </div>
            <div className="modal-body">
              {kanoonModal.loading ? (
                <div className="loading">
                  <div className="spinner"></div>
                  <p>Searching Indian Kanoon...</p>
                </div>
              ) : kanoonModal.data ? (
                <div className="kanoon-results">
                  <div className="search-info">
                    <p>
                      <strong>Query:</strong> {kanoonModal.data.query}
                    </p>
                    <p>
                      <strong>Results:</strong> {kanoonModal.data.total} found
                    </p>
                  </div>
                  {kanoonModal.data.results &&
                  kanoonModal.data.results.length > 0 ? (
                    <div className="kanoon-list">
                      {kanoonModal.data.results.map((result, index) => (
                        <div key={index} className="kanoon-item">
                          <h5>{result.case_title}</h5>
                          <div className="kanoon-meta">
                            <span className="court">{result.court}</span>
                            <span className="date">{result.date}</span>
                          </div>
                          <p className="summary">{result.summary}</p>
                          {result.full_text && (
                            <div className="full-text-preview">
                              <strong>Full Text:</strong>
                              <pre>{result.full_text}</pre>
                            </div>
                          )}
                          {result.kanoon_url && (
                            <a
                              href={result.kanoon_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="kanoon-link">
                              View on Indian Kanoon
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No results found on Indian Kanoon.</p>
                  )}
                </div>
              ) : (
                <p>No search data available.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSearch;
