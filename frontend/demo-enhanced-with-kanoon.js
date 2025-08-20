// Demo script for Enhanced Search with Indian Kanoon Integration
const axios = require("axios");

const BASE_URL = "http://localhost:3001";

async function demoEnhancedWithKanoon() {
  console.log("🚀 Enhanced Search with Indian Kanoon Integration Demo");
  console.log("=" * 70);
  console.log(
    "Features: Multi-source Search + Debounced Suggestions + Results Tabs"
  );
  console.log("=" * 70);

  try {
    // Wait for backend to be ready
    console.log("\n⏳ Waiting for backend to be ready...");
    let retries = 0;
    while (retries < 10) {
      try {
        await axios.get(`${BASE_URL}/health`);
        console.log("✅ Backend is ready!");
        break;
      } catch (error) {
        retries++;
        if (retries >= 10) {
          throw new Error("Backend not responding after 10 retries");
        }
        console.log(`   Retry ${retries}/10...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Demo 1: Enhanced Search with Indian Kanoon
    console.log("\n🔍 Demo 1: Enhanced Search with Indian Kanoon Integration");
    console.log('Searching for: "498A" with enhanced search');

    try {
      const enhancedResponse = await axios.get(
        `${BASE_URL}/api/enhanced-search?q=498A&limit=10&include_kanoon=true&include_local=true`
      );

      console.log(
        `✅ Enhanced Search Results: ${enhancedResponse.data.results.length} results`
      );
      console.log(`   Sources: ${enhancedResponse.data.sources.join(", ")}`);
      console.log(`   Total: ${enhancedResponse.data.total}`);

      if (enhancedResponse.data.results.length > 0) {
        console.log("\n   Sample Results:");
        enhancedResponse.data.results.slice(0, 3).forEach((result, idx) => {
          const title = result.case_title || result.act_name || "Unknown";
          const source = result.source || "Unknown";
          const type =
            result.index === "indian_judgments_index"
              ? "Case Law"
              : result.index === "indian_law_index"
              ? "Legislation"
              : "Document";
          console.log(`     ${idx + 1}. ${title}`);
          console.log(
            `        Type: ${type} | Source: ${source} | Score: ${
              result.score?.toFixed(3) || "N/A"
            }`
          );
        });
      }
    } catch (error) {
      console.log(`   ⚠️ Enhanced search failed: ${error.message}`);
    }

    // Demo 2: Local Search Only
    console.log("\n🔍 Demo 2: Local Database Search Only");
    console.log('Searching for: "criminal" with local search only');

    try {
      const localResponse = await axios.get(
        `${BASE_URL}/api/search?q=criminal&limit=5`
      );

      console.log(
        `✅ Local Search Results: ${localResponse.data.results.length} results`
      );

      if (localResponse.data.results.length > 0) {
        console.log("\n   Sample Results:");
        localResponse.data.results.slice(0, 2).forEach((result, idx) => {
          const title = result.case_title || result.act_name || "Unknown";
          const type =
            result.index === "indian_judgments_index"
              ? "Case Law"
              : "Legislation";
          console.log(`     ${idx + 1}. ${title}`);
          console.log(
            `        Type: ${type} | Source: ${
              result.source || "Local Database"
            }`
          );
        });
      }
    } catch (error) {
      console.log(`   ⚠️ Local search failed: ${error.message}`);
    }

    // Demo 3: Indian Kanoon Specific Search
    console.log("\n🔍 Demo 3: Indian Kanoon Specific Endpoints");

    try {
      // Test Kanoon search endpoint
      const kanoonResponse = await axios.get(
        `${BASE_URL}/api/kanoon/search?q=anticipatory bail&limit=5`
      );
      console.log(
        `✅ Kanoon Search: ${kanoonResponse.data.results.length} results`
      );

      // Test Kanoon cases endpoint
      const kanoonCasesResponse = await axios.get(
        `${BASE_URL}/api/kanoon/cases?court=Supreme Court&limit=3`
      );
      console.log(
        `✅ Kanoon Cases by Court: ${kanoonCasesResponse.data.results.length} results`
      );
    } catch (error) {
      console.log(`   ⚠️ Kanoon endpoints failed: ${error.message}`);
    }

    // Demo 4: Suggestions with Source Information
    console.log("\n🔍 Demo 4: Enhanced Suggestions with Source Info");

    try {
      const suggestResponse = await axios.get(
        `${BASE_URL}/api/suggest?q=crim&limit=5`
      );

      console.log(
        `✅ Suggestions: ${suggestResponse.data.suggestions.length} suggestions`
      );

      if (suggestResponse.data.suggestions.length > 0) {
        console.log("\n   Sample Suggestions:");
        suggestResponse.data.suggestions
          .slice(0, 3)
          .forEach((suggestion, idx) => {
            console.log(`     ${idx + 1}. ${suggestion.text}`);
            console.log(
              `        Type: ${suggestion.type} | Source: ${
                suggestion.source || "Local"
              }`
            );
          });
      }
    } catch (error) {
      console.log(`   ⚠️ Suggestions failed: ${error.message}`);
    }

    // Demo 5: Multi-index Analysis with Sources
    console.log("\n🔍 Demo 5: Multi-source Search Analysis");
    const analysisTerms = ["rights", "amendment", "bail"];

    for (const term of analysisTerms) {
      console.log(`\nAnalyzing "${term}":`);
      try {
        const analysisResponse = await axios.get(
          `${BASE_URL}/api/enhanced-search?q=${term}&limit=15&include_kanoon=true&include_local=true`
        );

        const results = analysisResponse.data.results;
        const sources = analysisResponse.data.sources;

        console.log(`  Total Results: ${results.length}`);
        console.log(`  Sources: ${sources.join(", ")}`);

        // Count by source
        const sourceCounts = {};
        results.forEach((result) => {
          const source = result.source || "Unknown";
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        });

        Object.entries(sourceCounts).forEach(([source, count]) => {
          console.log(`  ${source}: ${count} results`);
        });

        // Count by type
        const legislation = results.filter(
          (r) => r.index === "indian_law_index"
        ).length;
        const caseLaw = results.filter(
          (r) => r.index === "indian_judgments_index"
        ).length;
        console.log(`  📚 Legislation: ${legislation}`);
        console.log(`  ⚖️ Case Law: ${caseLaw}`);
      } catch (error) {
        console.log(`  Error analyzing: ${error.message}`);
      }
    }

    console.log("\n🎉 Enhanced Search with Indian Kanoon Demo Completed!");
    console.log("\n📋 New Features Available:");
    console.log("  ✅ Enhanced Search Endpoint (/api/enhanced-search)");
    console.log("  ✅ Indian Kanoon Integration (Mock API)");
    console.log("  ✅ Multi-source Search Results");
    console.log("  ✅ Source-based Result Filtering");
    console.log("  ✅ Enhanced Frontend with Source Toggle");
    console.log("  ✅ Source Information Display");

    console.log("\n🌐 Frontend Features:");
    console.log("  ✅ Enhanced Search Toggle (Local + Kanoon)");
    console.log("  ✅ Source Information in Results");
    console.log("  ✅ Search Sources Display");
    console.log("  ✅ Enhanced Result Cards");

    console.log("\n🔧 Backend Endpoints:");
    console.log("  ✅ /api/enhanced-search - Multi-source search");
    console.log("  ✅ /api/kanoon/search - Indian Kanoon search");
    console.log("  ✅ /api/kanoon/cases - Kanoon case queries");

    console.log("\n🌐 Open your browser and navigate to:");
    console.log("  http://localhost:3000");
    console.log('  Click "🚀 Enhanced Search" to try the new interface!');
    console.log('  Toggle between "Enhanced Search" and "Local Database Only"');
  } catch (error) {
    console.error("❌ Demo failed:", error.message);
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", error.response.data);
    }
  }
}

// Run the demo
demoEnhancedWithKanoon();
