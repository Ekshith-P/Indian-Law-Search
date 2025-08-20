// Demo script for Enhanced Search features
const axios = require("axios");

const BASE_URL = "http://localhost:3001";

async function demoEnhancedSearch() {
  console.log("🚀 Enhanced Search Demo - Indian Law Search Platform");
  console.log("=" * 60);
  console.log("Features: Debounced Suggestions + Results Tabs + Case Cards");
  console.log("=" * 60);

  try {
    // Demo 1: Criminal Law Search
    console.log("\n🔍 Demo 1: Criminal Law Search");
    console.log('Searching for: "criminal"');
    const criminalSearch = await axios.get(
      `${BASE_URL}/api/search?q=criminal&limit=5`
    );
    console.log(`Found ${criminalSearch.data.results.length} results`);

    criminalSearch.data.results.forEach((result, idx) => {
      const title = result.case_title || result.act_name || "Unknown";
      const type =
        result.index === "indian_judgments_index" ? "Case Law" : "Legislation";
      const source = result.court || "Legislation";
      console.log(`  ${idx + 1}. ${title}`);
      console.log(
        `     Type: ${type} | Source: ${source} | Score: ${
          result._score?.toFixed(3) || "N/A"
        }`
      );
    });

    // Demo 2: Constitutional Law Search
    console.log("\n🔍 Demo 2: Constitutional Law Search");
    console.log('Searching for: "constitutional"');
    const constitutionalSearch = await axios.get(
      `${BASE_URL}/api/search?q=constitutional&limit=5`
    );
    console.log(`Found ${constitutionalSearch.data.results.length} results`);

    constitutionalSearch.data.results.forEach((result, idx) => {
      const title = result.case_title || result.act_name || "Unknown";
      const type =
        result.index === "indian_judgments_index" ? "Case Law" : "Legislation";
      const source = result.court || "Legislation";
      console.log(`  ${idx + 1}. ${title}`);
      console.log(
        `     Type: ${type} | Source: ${source} | Score: ${
          result._score?.toFixed(3) || "N/A"
        }`
      );
    });

    // Demo 3: Specific Section Search
    console.log("\n🔍 Demo 3: Specific Section Search (498A)");
    console.log('Searching for: "498A"');
    const sectionSearch = await axios.get(
      `${BASE_URL}/api/search?q=498A&limit=5`
    );
    console.log(`Found ${sectionSearch.data.results.length} results`);

    sectionSearch.data.results.forEach((result, idx) => {
      const title = result.case_title || result.act_name || "Unknown";
      const type =
        result.index === "indian_judgments_index" ? "Case Law" : "Legislation";
      const source = result.court || "Legislation";
      console.log(`  ${idx + 1}. ${title}`);
      console.log(
        `     Type: ${type} | Source: ${source} | Score: ${
          result._score?.toFixed(3) || "N/A"
        }`
      );
    });

    // Demo 4: Suggestions Demo
    console.log("\n🔍 Demo 4: Autocomplete Suggestions");
    const suggestionTerms = ["crim", "const", "498", "fund"];

    for (const term of suggestionTerms) {
      console.log(`\nSuggestions for "${term}":`);
      try {
        const suggestResponse = await axios.get(
          `${BASE_URL}/api/suggest?q=${term}&limit=3`
        );
        if (suggestResponse.data.suggestions.length > 0) {
          suggestResponse.data.suggestions.forEach((suggestion, idx) => {
            console.log(
              `  ${idx + 1}. ${suggestion.text} (${suggestion.type})`
            );
          });
        } else {
          console.log("  No suggestions found");
        }
      } catch (err) {
        console.log(`  Error getting suggestions: ${err.message}`);
      }
    }

    // Demo 5: Multi-index Analysis
    console.log("\n🔍 Demo 5: Multi-index Search Analysis");
    const analysisTerms = ["rights", "amendment", "bail", "arrest"];

    for (const term of analysisTerms) {
      console.log(`\nAnalyzing "${term}":`);
      try {
        const analysisResponse = await axios.get(
          `${BASE_URL}/api/search?q=${term}&limit=10`
        );
        const results = analysisResponse.data.results;

        const legislation = results.filter(
          (r) => r.index === "indian_law_index"
        );
        const caseLaw = results.filter(
          (r) => r.index === "indian_judgments_index"
        );

        console.log(`  Total Results: ${results.length}`);
        console.log(`  📚 Legislation: ${legislation.length}`);
        console.log(`  ⚖️ Case Law: ${caseLaw.length}`);

        if (legislation.length > 0) {
          console.log(
            `  Top Legislation: ${legislation[0].act_name || "Unknown"}`
          );
        }
        if (caseLaw.length > 0) {
          console.log(`  Top Case: ${caseLaw[0].case_title || "Unknown"}`);
        }
      } catch (err) {
        console.log(`  Error analyzing: ${err.message}`);
      }
    }

    console.log("\n🎉 Enhanced Search Demo Completed!");
    console.log("\n📋 UI Features Available:");
    console.log("  ✅ Debounced Search Bar (300ms delay)");
    console.log("  ✅ Real-time Autocomplete Suggestions");
    console.log("  ✅ Results Tabs (All, Legislation, Case Law)");
    console.log("  ✅ Enhanced Case Cards with Details");
    console.log("  ✅ Search Result Highlighting");
    console.log("  ✅ Multi-index Search Results");
    console.log("  ✅ Responsive Design & Hover Effects");

    console.log("\n🌐 Open your browser and navigate to:");
    console.log("  http://localhost:3000");
    console.log('  Click "🚀 Enhanced Search" to try the new interface!');
  } catch (error) {
    console.error("❌ Demo failed:", error.message);
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", error.response.data);
    }
  }
}

// Run the demo
demoEnhancedSearch();
