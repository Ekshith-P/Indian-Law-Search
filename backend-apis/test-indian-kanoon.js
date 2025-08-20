const IndianKanoonAPI = require("./indian-kanoon-api");

// Your API key
const API_KEY = "dccba2fb72d53cfef3032bf421f36cdce867b409";

async function testIndianKanoonAPI() {
  console.log("🧪 Testing Indian Kanoon API Integration");
  console.log("=" * 50);

  try {
    // Initialize the API
    const kanoonAPI = new IndianKanoonAPI(API_KEY);
    console.log("✅ Indian Kanoon API initialized");

    // Test 1: Basic case search
    console.log("\n1️⃣ Testing basic case search...");
    try {
      const searchResults = await kanoonAPI.searchCases("498A", 5);
      console.log(
        `✅ Search successful: Found ${searchResults.length || 0} results`
      );

      if (searchResults && searchResults.length > 0) {
        console.log("   Sample result:");
        const firstResult = searchResults[0];
        console.log(
          `   - Title: ${firstResult.title || firstResult.case_title || "N/A"}`
        );
        console.log(`   - Court: ${firstResult.court || "N/A"}`);
        console.log(
          `   - Date: ${firstResult.date || firstResult.judgment_date || "N/A"}`
        );
      }
    } catch (error) {
      console.log(`   ⚠️ Search failed: ${error.message}`);
    }

    // Test 2: Citation search
    console.log("\n2️⃣ Testing citation search...");
    try {
      const citationResults = await kanoonAPI.searchByCitation(
        "(2014) 8 SCC 273"
      );
      console.log(
        `✅ Citation search successful: Found ${
          citationResults.length || 0
        } results`
      );
    } catch (error) {
      console.log(`   ⚠️ Citation search failed: ${error.message}`);
    }

    // Test 3: Court search
    console.log("\n3️⃣ Testing court search...");
    try {
      const courtResults = await kanoonAPI.searchByCourt("Supreme Court", 3);
      console.log(
        `✅ Court search successful: Found ${courtResults.length || 0} results`
      );
    } catch (error) {
      console.log(`   ⚠️ Court search failed: ${error.message}`);
    }

    // Test 4: Recent judgments
    console.log("\n4️⃣ Testing recent judgments...");
    try {
      const recentResults = await kanoonAPI.getRecentJudgments(3);
      console.log(
        `✅ Recent judgments successful: Found ${
          recentResults.length || 0
        } results`
      );
    } catch (error) {
      console.log(`   ⚠️ Recent judgments failed: ${error.message}`);
    }

    // Test 5: Act search
    console.log("\n5️⃣ Testing act search...");
    try {
      const actResults = await kanoonAPI.searchByAct("IPC", "498A", 3);
      console.log(
        `✅ Act search successful: Found ${actResults.length || 0} results`
      );
    } catch (error) {
      console.log(`   ⚠️ Act search failed: ${error.message}`);
    }

    // Test 6: Data transformation
    console.log("\n6️⃣ Testing data transformation...");
    try {
      const sampleData = [
        {
          id: 12345,
          title: "Sample Case Title",
          court: "Supreme Court of India",
          judges: ["Justice A", "Justice B"],
          date: "2023-01-01",
          citation: "(2023) 1 SCC 123",
          text: "Sample case text content...",
          summary: "Sample case summary...",
          sections: ["IPC 498A", "CrPC 41"],
          tags: ["criminal", "498A"],
          url: "https://example.com/case",
        },
      ];

      const transformedData = kanoonAPI.transformCaseData(sampleData);
      console.log(
        `✅ Data transformation successful: Transformed ${transformedData.length} items`
      );

      if (transformedData.length > 0) {
        const transformed = transformedData[0];
        console.log("   Transformed item:");
        console.log(`   - ID: ${transformed.id}`);
        console.log(`   - Title: ${transformed.case_title}`);
        console.log(`   - Court: ${transformed.court}`);
        console.log(`   - Source: ${transformed.source}`);
      }
    } catch (error) {
      console.log(`   ❌ Data transformation failed: ${error.message}`);
    }

    // Test 7: Enhanced search
    console.log("\n7️⃣ Testing enhanced search...");
    try {
      const enhancedResults = await kanoonAPI.enhancedSearch(
        "anticipatory bail",
        {
          limit: 10,
          includeKanoon: true,
        }
      );
      console.log(
        `✅ Enhanced search successful: Found ${enhancedResults.total} results`
      );
      console.log(`   Source: ${enhancedResults.source}`);
      console.log(`   Query: ${enhancedResults.query}`);
    } catch (error) {
      console.log(`   ⚠️ Enhanced search failed: ${error.message}`);
    }

    console.log("\n🎉 Indian Kanoon API testing completed!");
    console.log("\n📋 Next steps:");
    console.log("   1. Integrate with main search endpoint");
    console.log("   2. Add to Elasticsearch indexing");
    console.log("   3. Update frontend to show source information");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the test
testIndianKanoonAPI();
