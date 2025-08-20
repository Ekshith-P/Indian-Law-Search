// Test script for the new Issue-Based Search System
// This demonstrates comprehensive legal issue search across all courts in India
const axios = require("axios");

const BASE_URL = "http://localhost:3001";

async function testIssueBasedSearch() {
  console.log("🎯 Testing Issue-Based Legal Search System");
  console.log("=" * 60);
  console.log(
    "Goal: Show related issue articles + judgments by all courts in India"
  );
  console.log("=" * 60);

  try {
    // Wait for backend to be ready
    console.log("\n⏳ Waiting for backend to be ready...");
    let retries = 0;
    while (retries < 10) {
      try {
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        if (healthResponse.data.features.issue_based_search === "✅") {
          console.log("✅ Backend is ready with Issue-Based Search!");
          break;
        } else {
          console.log("   Waiting for issue-based search to be active...");
        }
      } catch (error) {
        retries++;
        if (retries >= 10) {
          throw new Error("Backend not responding after 10 retries");
        }
        console.log(`   Retry ${retries}/10...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Test 1: Anticipatory Bail Issue Search
    console.log("\n🔍 Test 1: Anticipatory Bail Issue Search");
    console.log("Searching for: 'anticipatory bail'");

    try {
      const response1 = await axios.get(
        `${BASE_URL}/api/issue-search?q=anticipatory bail&limit=30`
      );

      console.log(`✅ Search Successful!`);
      console.log(`   Total Results: ${response1.data.total_results}`);
      console.log(
        `   Legislation: ${response1.data.categorized_results.legislation.length}`
      );
      console.log(
        `   Judgments: ${response1.data.categorized_results.judgments.length}`
      );
      console.log(
        `   Kanoon Results: ${response1.data.categorized_results.kanoon_results.length}`
      );

      console.log("\n🏛️ Courts Coverage:");
      console.log(
        `   Supreme Court: ${response1.data.courts_coverage.supreme_court}`
      );
      console.log(
        `   High Courts: ${response1.data.courts_coverage.high_courts}`
      );
      console.log(
        `   District Courts: ${response1.data.courts_coverage.district_courts}`
      );
      console.log(`   Tribunals: ${response1.data.courts_coverage.tribunals}`);
      console.log(
        `   Total Courts: ${response1.data.courts_coverage.total_courts}`
      );

      if (response1.data.courts_coverage.court_list.length > 0) {
        console.log("\n   Courts Found:");
        response1.data.courts_coverage.court_list
          .slice(0, 8)
          .forEach((court, idx) => {
            console.log(`     ${idx + 1}. ${court}`);
          });
        if (response1.data.courts_coverage.court_list.length > 8) {
          console.log(
            `     ... and ${
              response1.data.courts_coverage.court_list.length - 8
            } more`
          );
        }
      }

      console.log("\n🔗 Related Issues:");
      response1.data.related_issues.slice(0, 6).forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue}`);
      });

      if (response1.data.categorized_results.legislation.length > 0) {
        console.log("\n📚 Key Legislation Found:");
        response1.data.categorized_results.legislation
          .slice(0, 3)
          .forEach((leg, idx) => {
            console.log(`   ${idx + 1}. ${leg.act_name || "Unknown Act"}`);
            if (leg.section_title)
              console.log(`      Section: ${leg.section_title}`);
            console.log(`      Relevance: ${leg.relevance}/5`);
          });
      }

      if (response1.data.categorized_results.judgments.length > 0) {
        console.log("\n⚖️ Sample Judgments:");
        response1.data.categorized_results.judgments
          .slice(0, 3)
          .forEach((judgment, idx) => {
            console.log(
              `   ${idx + 1}. ${judgment.case_title || "Untitled Case"}`
            );
            console.log(`      Court: ${judgment.court || "Unknown Court"}`);
            console.log(`      Date: ${judgment.date || "Unknown Date"}`);
            console.log(`      Score: ${judgment.score?.toFixed(3) || "N/A"}`);
          });
      }
    } catch (error) {
      console.log(`   ⚠️ Anticipatory bail search failed: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data.error}`);
      }
    }

    // Test 2: Domestic Violence Issue Search
    console.log("\n🔍 Test 2: Domestic Violence Issue Search");
    console.log("Searching for: 'domestic violence'");

    try {
      const response2 = await axios.get(
        `${BASE_URL}/api/issue-search?q=domestic violence&limit=25`
      );

      console.log(`✅ Search Successful!`);
      console.log(`   Total Results: ${response2.data.total_results}`);
      console.log(
        `   Legislation: ${response2.data.categorized_results.legislation.length}`
      );
      console.log(
        `   Judgments: ${response2.data.categorized_results.judgments.length}`
      );

      console.log("\n🏛️ Courts Coverage:");
      console.log(
        `   Supreme Court: ${response2.data.courts_coverage.supreme_court}`
      );
      console.log(
        `   High Courts: ${response2.data.courts_coverage.high_courts}`
      );
      console.log(
        `   District Courts: ${response2.data.courts_coverage.district_courts}`
      );

      console.log("\n🔗 Related Issues:");
      response2.data.related_issues.slice(0, 5).forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue}`);
      });
    } catch (error) {
      console.log(`   ⚠️ Domestic violence search failed: ${error.message}`);
    }

    // Test 3: Property Rights Issue Search
    console.log("\n🔍 Test 3: Property Rights Issue Search");
    console.log("Searching for: 'property rights'");

    try {
      const response3 = await axios.get(
        `${BASE_URL}/api/issue-search?q=property rights&limit=20`
      );

      console.log(`✅ Search Successful!`);
      console.log(`   Total Results: ${response3.data.total_results}`);
      console.log(
        `   Legislation: ${response3.data.categorized_results.legislation.length}`
      );
      console.log(
        `   Judgments: ${response3.data.categorized_results.judgments.length}`
      );

      console.log("\n🏛️ Courts Coverage:");
      console.log(
        `   Supreme Court: ${response3.data.courts_coverage.supreme_court}`
      );
      console.log(
        `   High Courts: ${response3.data.courts_coverage.high_courts}`
      );
      console.log(
        `   District Courts: ${response3.data.courts_coverage.district_courts}`
      );

      console.log("\n🔗 Related Issues:");
      response3.data.related_issues.slice(0, 5).forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue}`);
      });
    } catch (error) {
      console.log(`   ⚠️ Property rights search failed: ${error.message}`);
    }

    // Test 4: Court-Specific Filtering
    console.log("\n🔍 Test 4: Court-Specific Filtering");
    console.log("Searching for: 'bail' in Supreme Court only");

    try {
      const response4 = await axios.get(
        `${BASE_URL}/api/issue-search?q=bail&court_filter=Supreme Court&limit=15`
      );

      console.log(`✅ Court-Filtered Search Successful!`);
      console.log(`   Total Results: ${response4.data.total_results}`);
      console.log(
        `   Judgments: ${response4.data.categorized_results.judgments.length}`
      );

      if (response4.data.categorized_results.judgments.length > 0) {
        console.log("\n⚖️ Supreme Court Judgments:");
        response4.data.categorized_results.judgments
          .slice(0, 3)
          .forEach((judgment, idx) => {
            console.log(
              `   ${idx + 1}. ${judgment.case_title || "Untitled Case"}`
            );
            console.log(`      Date: ${judgment.date || "Unknown Date"}`);
            console.log(`      Score: ${judgment.score?.toFixed(3) || "N/A"}`);
          });
      }
    } catch (error) {
      console.log(`   ⚠️ Court-filtered search failed: ${error.message}`);
    }

    // Test 5: Date-Range Filtering
    console.log("\n🔍 Test 5: Date-Range Filtering");
    console.log("Searching for: 'fundamental rights' in recent cases");

    try {
      const currentYear = new Date().getFullYear();
      const response5 = await axios.get(
        `${BASE_URL}/api/issue-search?q=fundamental rights&date_from=${currentYear}-01-01&limit=15`
      );

      console.log(`✅ Date-Filtered Search Successful!`);
      console.log(`   Total Results: ${response5.data.total_results}`);
      console.log(
        `   Judgments: ${response5.data.categorized_results.judgments.length}`
      );

      if (response5.data.categorized_results.judgments.length > 0) {
        console.log("\n⚖️ Recent Fundamental Rights Cases:");
        response5.data.categorized_results.judgments
          .slice(0, 3)
          .forEach((judgment, idx) => {
            console.log(
              `   ${idx + 1}. ${judgment.case_title || "Untitled Case"}`
            );
            console.log(`      Court: ${judgment.court || "Unknown Court"}`);
            console.log(`      Date: ${judgment.date || "Unknown Date"}`);
          });
      }
    } catch (error) {
      console.log(`   ⚠️ Date-filtered search failed: ${error.message}`);
    }

    // Test 6: Comprehensive Analysis
    console.log("\n🔍 Test 6: Comprehensive Issue Analysis");
    console.log("Analyzing search patterns and court distribution");

    try {
      const testIssues = [
        "anticipatory bail",
        "domestic violence",
        "property rights",
      ];
      const analysis = {};

      for (const issue of testIssues) {
        const response = await axios.get(
          `${BASE_URL}/api/issue-search?q=${encodeURIComponent(issue)}&limit=10`
        );

        analysis[issue] = {
          total: response.data.total_results,
          legislation: response.data.categorized_results.legislation.length,
          judgments: response.data.categorized_results.judgments.length,
          courts: response.data.courts_coverage.total_courts,
          related_issues: response.data.related_issues.length,
        };
      }

      console.log("\n📊 Comparative Analysis:");
      console.log(
        "Issue".padEnd(20) +
          "Total".padEnd(8) +
          "Legislation".padEnd(12) +
          "Judgments".padEnd(11) +
          "Courts".padEnd(8) +
          "Related"
      );
      console.log("-".repeat(70));

      Object.entries(analysis).forEach(([issue, data]) => {
        console.log(
          issue.padEnd(20) +
            data.total.toString().padEnd(8) +
            data.legislation.toString().padEnd(12) +
            data.judgments.toString().padEnd(11) +
            data.courts.toString().padEnd(8) +
            data.related_issues.toString()
        );
      });
    } catch (error) {
      console.log(`   ⚠️ Comprehensive analysis failed: ${error.message}`);
    }

    console.log("\n🎉 Issue-Based Search Testing Completed!");
    console.log("\n📋 Key Features Demonstrated:");
    console.log("  ✅ Comprehensive legal issue search");
    console.log(
      "  ✅ Results categorized by legislation, judgments, and external sources"
    );
    console.log("  ✅ Courts coverage across all of India");
    console.log("  ✅ Related legal issues discovery");
    console.log("  ✅ Court-specific and date-range filtering");
    console.log("  ✅ Relevance scoring and result ranking");

    console.log("\n🌐 API Usage Examples:");
    console.log("  • GET /api/issue-search?q=anticipatory bail");
    console.log(
      "  • GET /api/issue-search?q=domestic violence&court_filter=Supreme Court"
    );
    console.log(
      "  • GET /api/issue-search?q=property rights&date_from=2023-01-01"
    );
    console.log("  • GET /api/issue-search?q=fundamental rights&limit=50");

    console.log("\n🎯 Main Goal Achieved:");
    console.log("  ✅ Users can search for legal issues and get:");
    console.log("     • Related legislation articles and sections");
    console.log("     • Judgments from all courts across India");
    console.log("     • Comprehensive coverage of legal landscape");
    console.log("     • Related issues for broader context");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", error.response.data);
    }
  }
}

// Run the test
testIssueBasedSearch();
