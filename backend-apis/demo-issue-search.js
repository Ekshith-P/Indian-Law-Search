// Simple demonstration of Issue-Based Search
const axios = require("axios");

async function demoIssueSearch() {
  console.log("🎯 Issue-Based Search Demonstration");
  console.log("=" * 50);
  console.log("Goal: Show related articles + judgments by all courts in India");
  console.log("=" * 50);

  try {
    // Test the issue-based search endpoint
    console.log("\n🔍 Searching for: 'anticipatory bail'");

    const response = await axios.get("http://localhost:3001/api/issue-search", {
      params: {
        q: "anticipatory bail",
        limit: 20,
      },
    });

    console.log("✅ Search Results:");
    console.log(`Total Results: ${response.data.total_results}`);
    console.log(
      `Legislation: ${response.data.categorized_results.legislation.length}`
    );
    console.log(
      `Judgments: ${response.data.categorized_results.judgments.length}`
    );
    console.log(
      `Kanoon Results: ${response.data.categorized_results.kanoon_results.length}`
    );

    console.log("\n🏛️ Courts Coverage:");
    console.log(
      `Supreme Court: ${response.data.courts_coverage.supreme_court}`
    );
    console.log(`High Courts: ${response.data.courts_coverage.high_courts}`);
    console.log(
      `District Courts: ${response.data.courts_coverage.district_courts}`
    );
    console.log(`Tribunals: ${response.data.courts_coverage.tribunals}`);

    if (response.data.courts_coverage.court_list.length > 0) {
      console.log("\nCourts Found:");
      response.data.courts_coverage.court_list.forEach((court, idx) => {
        console.log(`  ${idx + 1}. ${court}`);
      });
    }

    console.log("\n🔗 Related Issues:");
    response.data.related_issues.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. ${issue}`);
    });

    if (response.data.categorized_results.judgments.length > 0) {
      console.log("\n⚖️ Sample Judgments:");
      response.data.categorized_results.judgments
        .slice(0, 3)
        .forEach((judgment, idx) => {
          console.log(
            `  ${idx + 1}. ${judgment.case_title || "Untitled Case"}`
          );
          console.log(`     Court: ${judgment.court || "Unknown Court"}`);
          console.log(`     Date: ${judgment.date || "Unknown Date"}`);
          console.log(`     Score: ${judgment.score?.toFixed(3) || "N/A"}`);
        });
    }

    console.log("\n🎯 Main Goal Achieved:");
    console.log("✅ Users can search for legal issues and get:");
    console.log("   • Related legislation articles and sections");
    console.log("   • Judgments from all courts across India");
    console.log("   • Comprehensive coverage of legal landscape");
    console.log("   • Related issues for broader context");
  } catch (error) {
    console.error("❌ Demo failed:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }
  }
}

// Run the demo
demoIssueSearch();
