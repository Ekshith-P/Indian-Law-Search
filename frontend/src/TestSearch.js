import React, { useState } from "react";

function TestSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Debounced search function for real-time suggestions
  const debouncedSearch = React.useCallback(
    React.useMemo(() => {
      let timeoutId;
      return (searchTerm) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (searchTerm.trim().length >= 2) {
            setSuggestionsLoading(true);
            try {
              const response = await fetch(
                `http://localhost:3001/api/suggest?q=${encodeURIComponent(
                  searchTerm
                )}&limit=5`
              );
              if (response.ok) {
                const data = await response.json();
                setSuggestions(data.suggestions || []);
                setShowSuggestions(true);
              }
            } catch (err) {
              console.error("Suggestion search failed:", err);
            } finally {
              setSuggestionsLoading(false);
            }
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
            setSuggestionsLoading(false);
          }
        }, 300); // 300ms delay
      };
    }, []),
    []
  );

  // Handle input change with real-time suggestions
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(false);

    if (value.trim().length >= 2) {
      debouncedSearch(value);
    } else {
      setSuggestions([]);
    }
  };

  const testSearch = async () => {
    setLoading(true);
    setError("");
    setShowSuggestions(false);

    try {
      console.log("Testing Elasticsearch search for:", query);
      const response = await fetch(
        `http://localhost:3001/api/search?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Elasticsearch search results:", data);
      setResults(data.results || []);
    } catch (err) {
      console.error("Search failed:", err);
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    // Trigger search for the selected suggestion
    setQuery(suggestion.text);
    setTimeout(() => testSearch(), 100);
  };

  const getResultTitle = (result) => {
    return result.case_title || result.act_name || result.title || "Untitled";
  };

  const getResultType = (result) => {
    if (result.index === "indian_judgments_index") return "Judgment";
    if (result.index === "indian_law_index") return "Law";
    return "Document";
  };

  const getResultSource = (result) => {
    if (result.court) return result.court;
    if (result.act_name) return "Legislation";
    return "Unknown Source";
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
      <h2>🔍 Elasticsearch Search Test</h2>
      <p style={{ color: "#666", marginBottom: "20px" }}>
        Search across judgments and laws using Elasticsearch with real-time
        suggestions
      </p>

      <div style={{ marginBottom: "20px", position: "relative" }}>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.trim().length >= 2 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Enter search term (e.g., 498A, constitutional, criminal)..."
          style={{
            padding: "12px",
            marginRight: "10px",
            width: "400px",
            fontSize: "16px",
            border: "2px solid #ddd",
            borderRadius: "6px",
          }}
        />
        <button
          onClick={testSearch}
          disabled={loading}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}>
          {loading ? "🔍 Searching..." : "🔍 Search"}
        </button>

        {/* Suggestions dropdown */}
        {showSuggestions && (suggestionsLoading || suggestions.length > 0) && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              backgroundColor: "white",
              border: "2px solid #ddd",
              borderRadius: "6px",
              maxHeight: "250px",
              overflowY: "auto",
              zIndex: 1000,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}>
            {suggestionsLoading ? (
              <div
                style={{ padding: "15px", textAlign: "center", color: "#666" }}>
                🔄 Loading suggestions...
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  style={{
                    padding: "12px",
                    cursor: "pointer",
                    borderBottom: "1px solid #eee",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = "#f8f9fa")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = "white")
                  }>
                  <div style={{ fontWeight: "bold", color: "#333" }}>
                    {suggestion.text}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginTop: "4px",
                    }}>
                    📄 {suggestion.type} • Score: {suggestion.score?.toFixed(2)}
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{ padding: "15px", textAlign: "center", color: "#666" }}>
                No suggestions found
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            color: "white",
            backgroundColor: "#dc3545",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "20px",
          }}>
          ❌ Error: {error}
        </div>
      )}

      {results.length > 0 && (
        <div>
          <h3>📊 Results ({results.length})</h3>
          {results.map((result, index) => (
            <div
              key={index}
              style={{
                border: "2px solid #e9ecef",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "16px",
                backgroundColor: "#f8f9fa",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "12px",
                }}>
                <h4 style={{ margin: 0, color: "#333" }}>
                  {getResultTitle(result)}
                </h4>
                <span
                  style={{
                    padding: "4px 8px",
                    backgroundColor:
                      result.index === "indian_judgments_index"
                        ? "#28a745"
                        : "#17a2b8",
                    color: "white",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}>
                  {getResultType(result)}
                </span>
              </div>

              <div style={{ marginBottom: "8px" }}>
                <strong>🏛️ Source:</strong> {getResultSource(result)}
              </div>

              {result.date && (
                <div style={{ marginBottom: "8px" }}>
                  <strong>📅 Date:</strong> {result.date}
                </div>
              )}

              {result.citation && (
                <div style={{ marginBottom: "8px" }}>
                  <strong>📚 Citation:</strong> {result.citation}
                </div>
              )}

              {result.summary && (
                <div style={{ marginBottom: "8px" }}>
                  <strong>📝 Summary:</strong> {result.summary}
                </div>
              )}

              {result.score && (
                <div style={{ marginBottom: "8px" }}>
                  <strong>⭐ Score:</strong> {result.score.toFixed(3)}
                </div>
              )}

              {result.highlights &&
                Object.keys(result.highlights).length > 0 && (
                  <div style={{ marginTop: "12px" }}>
                    <strong>🔍 Highlights:</strong>
                    {Object.entries(result.highlights).map(
                      ([field, highlights], idx) => (
                        <div
                          key={idx}
                          style={{ marginLeft: "16px", marginTop: "8px" }}>
                          <strong>{field}:</strong>
                          {highlights.map((highlight, hIdx) => (
                            <div
                              key={hIdx}
                              style={{
                                marginLeft: "16px",
                                marginTop: "4px",
                                padding: "8px",
                                backgroundColor: "#fff3cd",
                                borderRadius: "4px",
                                fontSize: "14px",
                              }}
                              dangerouslySetInnerHTML={{ __html: highlight }}
                            />
                          ))}
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && !error && (
        <div
          style={{
            padding: "24px",
            textAlign: "center",
            color: "#666",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
          }}>
          <p style={{ fontSize: "18px", marginBottom: "12px" }}>
            No results found for "{query}"
          </p>
          <p style={{ fontSize: "14px", marginTop: "10px" }}>
            Try searching for: "anticipatory", "constitutional", "criminal",
            "498A", "IPC", "CRPC"
          </p>
        </div>
      )}

      <div
        style={{
          marginTop: "24px",
          padding: "16px",
          backgroundColor: "#e9ecef",
          borderRadius: "8px",
        }}>
        <h4>🧪 Test Suggestions:</h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {[
            "anticipatory",
            "constitutional",
            "criminal",
            "498A",
            "IPC",
            "CRPC",
            "fundamental rights",
            "amendment",
          ].map((term) => (
            <button
              key={term}
              onClick={() => setQuery(term)}
              style={{
                padding: "8px 16px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "20px",
                cursor: "pointer",
                fontSize: "14px",
              }}>
              {term}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TestSearch;
