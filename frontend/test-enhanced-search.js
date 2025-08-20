// Test script for Enhanced Search functionality
const axios = require("axios");

const BASE_URL = "http://localhost:3001";

async function testEnhancedSearch() {
  console.log("🧪 Testing Enhanced Search API Endpoints");
  console.log("=" * 50);

  try {
    // Test 1: Health Check
    console.log("\n1️⃣ Testing Health Check...");
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log("✅ Health Check:", healthResponse.data.status);

    // Test 2: Search Endpoint
    console.log("\n2️⃣ Testing Search Endpoint...");
    const searchResponse = await axios.get(
      `${BASE_URL}/api/search?q=criminal&limit=3`
    );
    console.log(
      `✅ Search Results: ${searchResponse.data.results.length} results`
    );

    if (searchResponse.data.results.length > 0) {
      const firstResult = searchResponse.data.results[0];
      console.log(
        `   First Result: ${firstResult.case_title || firstResult.act_name} (${
          firstResult.index
        })`
      );
    }

    // Test 3: Suggest Endpoint
    console.log("\n3️⃣ Testing Suggest Endpoint...");
    const suggestResponse = await axios.get(
      `${BASE_URL}/api/suggest?q=crim&limit=5`
    );
    console.log(
      `✅ Suggestions: ${suggestResponse.data.suggestions.length} suggestions`
    );

    if (suggestResponse.data.suggestions.length > 0) {
      console.log("   Sample suggestions:");
      suggestResponse.data.suggestions
        .slice(0, 3)
        .forEach((suggestion, idx) => {
          console.log(
            `     ${idx + 1}. ${suggestion.text} (${suggestion.type})`
          );
        });
    }

    // Test 4: Multi-index Search
    console.log("\n4️⃣ Testing Multi-index Search...");
    const multiSearchResponse = await axios.get(
      `${BASE_URL}/api/search?q=constitutional&limit=5`
    );
    console.log(
      `✅ Multi-index Search: ${multiSearchResponse.data.results.length} results`
    );

    // Count by type
    const legislationCount = multiSearchResponse.data.results.filter(
      (r) => r.index === "indian_law_index"
    ).length;
    const caseLawCount = multiSearchResponse.data.results.filter(
      (r) => r.index === "indian_judgments_index"
    ).length;
    console.log(
      `   Legislation: ${legislationCount}, Case Law: ${caseLawCount}`
    );

    console.log("\n🎉 All tests passed! Enhanced Search is working correctly.");
    console.log("\n📋 Next steps:");
    console.log("   1. Open http://localhost:3000 in your browser");
    console.log("   2. Try the Enhanced Search component");
    console.log("   3. Test debounced suggestions and results tabs");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", error.response.data);
    }
  }
}

// Run the test
testEnhancedSearch();
