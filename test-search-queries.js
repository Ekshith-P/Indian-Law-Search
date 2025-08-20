const axios = require("axios");

// Test queries covering various legal topics
const testQueries = [
  // Criminal Law
  "498A bail",
  "anticipatory bail",
  "domestic violence",
  "criminal procedure",
  "arrest procedure",

  // Constitutional Law
  "Article 21 privacy",
  "Article 14 equality",
  "Article 12 state definition",
  "fundamental rights",
  "right to life",

  // Property Law
  "property rights",
  "land acquisition",
  "tenancy rights",
  "property dispute",

  // Family Law
  "divorce procedure",
  "maintenance rights",
  "custody rights",
  "marriage laws",

  // Labor Law
  "industrial disputes",
  "workmen compensation",
  "termination rights",
];

const API_BASE_URL = "http://localhost:3001";

async function testSearchQuery(query) {
  try {
    console.log(`\n🔍 Testing: "${query}"`);
    const startTime = Date.now();

    const response = await axios.get(
      `${API_BASE_URL}/api/issue-search?q=${encodeURIComponent(query)}&limit=20`
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    const data = response.data;

    // Verify results structure
    console.log(`✅ Response received in ${duration}ms`);
    console.log(`📊 Total results: ${data.total_results}`);

    // Check if results exist
    if (data.categorized_results) {
      const { legislation, judgments, kanoon_results } =
        data.categorized_results;

      console.log(`📜 Legislation: ${legislation?.length || 0}`);
      console.log(`⚖️ Judgments: ${judgments?.length || 0}`);
      console.log(`🔗 External: ${kanoon_results?.length || 0}`);

      // Verify Supreme Court results rank higher
      if (judgments && judgments.length > 0) {
        const scResults = judgments.filter(
          (j) => j.court && j.court.toLowerCase().includes("supreme court")
        );
        const hcResults = judgments.filter(
          (j) => j.court && j.court.toLowerCase().includes("high court")
        );

        console.log(`🏛️ Supreme Court: ${scResults.length}`);
        console.log(`⚖️ High Courts: ${hcResults.length}`);

        // Check if SC results appear first
        if (scResults.length > 0 && hcResults.length > 0) {
          const firstSCIndex = judgments.findIndex(
            (j) => j.court && j.court.toLowerCase().includes("supreme court")
          );
          const firstHCIndex = judgments.findIndex(
            (j) => j.court && j.court.toLowerCase().includes("high court")
          );

          if (firstSCIndex < firstHCIndex) {
            console.log(`✅ Supreme Court results rank higher ✓`);
          } else {
            console.log(`⚠️ High Court results appear before Supreme Court`);
          }
        }
      }

      // Check issue overview
      if (data.issue_overview) {
        console.log(`📋 Issue overview: ${data.issue_overview.title}`);
      }

      // Check courts coverage
      if (data.courts_coverage) {
        console.log(`🏛️ Courts covered: ${data.courts_coverage.total_courts}`);
      }
    } else {
      console.log(`❌ No categorized results found`);
    }

    return { success: true, duration, results: data.total_results };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log("🚀 Starting comprehensive search testing...");
  console.log("=".repeat(60));

  const results = [];
  let successCount = 0;
  let totalDuration = 0;

  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    console.log(`\n${i + 1}/${testQueries.length}`);

    const result = await testSearchQuery(query);
    results.push({ query, ...result });

    if (result.success) {
      successCount++;
      totalDuration += result.duration;
    }

    // Add delay between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 TESTING SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Successful tests: ${successCount}/${testQueries.length}`);
  console.log(`❌ Failed tests: ${testQueries.length - successCount}`);
  console.log(
    `⏱️ Average response time: ${Math.round(totalDuration / successCount)}ms`
  );
  console.log(
    `📈 Success rate: ${Math.round((successCount / testQueries.length) * 100)}%`
  );

  // Failed queries
  const failedQueries = results.filter((r) => !r.success);
  if (failedQueries.length > 0) {
    console.log("\n❌ Failed queries:");
    failedQueries.forEach((fq) => {
      console.log(`   - "${fq.query}": ${fq.error}`);
    });
  }

  // Performance analysis
  const successfulResults = results.filter((r) => r.success);
  if (successfulResults.length > 0) {
    const avgResults = Math.round(
      successfulResults.reduce((sum, r) => sum + r.results, 0) /
        successfulResults.length
    );
    console.log(`📊 Average results per query: ${avgResults}`);
  }

  return results;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log("\n🎉 Testing completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Testing failed:", error);
      process.exit(1);
    });
}

module.exports = { testSearchQuery, runAllTests, testQueries };
