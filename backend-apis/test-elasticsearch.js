const { Client } = require("@elastic/elasticsearch");
const { MongoClient } = require("mongodb");

// Connect to Elasticsearch
const es = new Client({
  node: "http://localhost:9201",
  auth: {
    username: "elastic",
    password: "changeme",
  },
});

// MongoDB connection
const MONGODB_URI =
  "mongodb://admin:password@localhost:27018/indian_law_db?authSource=admin";

async function testElasticsearch() {
  let mongoClient = null;

  try {
    console.log("🧪 Testing Elasticsearch Setup");
    console.log("=" * 50);

    // 1. Test Elasticsearch connection
    console.log("\n1️⃣ Testing Elasticsearch connection...");
    try {
      const info = await es.info();
      console.log("✅ Elasticsearch connected successfully");
      console.log(`   Version: ${info.version.number}`);
      console.log(`   Cluster: ${info.cluster_name}`);
    } catch (error) {
      console.error("❌ Elasticsearch connection failed:", error.message);
      return;
    }

    // 2. Check indices
    console.log("\n2️⃣ Checking indices...");
    try {
      const indices = await es.cat.indices({ format: "json" });
      console.log("✅ Indices found:");
      indices.forEach((index) => {
        console.log(
          `   - ${index.index} (docs: ${index["docs.count"]}, size: ${index["store.size"]})`
        );
      });
    } catch (error) {
      console.error("❌ Failed to check indices:", error.message);
    }

    // 3. Test search functionality
    console.log("\n3️⃣ Testing search functionality...");

    // Test judgments search
    try {
      const judgmentSearch = await es.search({
        index: "indian_judgments_index",
        body: {
          query: {
            match: {
              text: "anticipatory",
            },
          },
          size: 3,
        },
      });
      console.log(
        `✅ Judgments search: Found ${judgmentSearch.hits.total.value} results`
      );
    } catch (error) {
      console.error("❌ Judgments search failed:", error.message);
    }

    // Test laws search
    try {
      const lawSearch = await es.search({
        index: "indian_law_index",
        body: {
          query: {
            match: {
              act_name: "IPC",
            },
          },
          size: 3,
        },
      });
      console.log(
        `✅ Laws search: Found ${lawSearch.hits.total.value} results`
      );
    } catch (error) {
      console.error("❌ Laws search failed:", error.message);
    }

    // 4. Test multi-index search
    console.log("\n4️⃣ Testing multi-index search...");
    try {
      const multiSearch = await es.search({
        index: ["indian_judgments_index", "indian_law_index"],
        body: {
          query: {
            multi_match: {
              query: "criminal",
              fields: ["case_title^3", "summary^2", "text", "act_name^2"],
            },
          },
          size: 5,
        },
      });
      console.log(
        `✅ Multi-index search: Found ${multiSearch.hits.total.value} results`
      );

      // Show sample results
      console.log("   Sample results:");
      multiSearch.hits.hits.slice(0, 3).forEach((hit, index) => {
        const title =
          hit._source.case_title || hit._source.act_name || "Unknown";
        const type =
          hit._index === "indian_judgments_index" ? "Judgment" : "Law";
        console.log(
          `     ${index + 1}. ${title} (${type}) - Score: ${hit._score.toFixed(
            3
          )}`
        );
      });
    } catch (error) {
      console.error("❌ Multi-index search failed:", error.message);
    }

    // 5. Test suggestions
    console.log("\n5️⃣ Testing suggestions...");
    try {
      const suggestions = await es.search({
        index: ["indian_judgments_index", "indian_law_index"],
        body: {
          query: {
            bool: {
              should: [
                {
                  prefix: {
                    "case_title.keyword": {
                      value: "crim",
                    },
                  },
                },
                {
                  prefix: {
                    "act_name.keyword": {
                      value: "crim",
                    },
                  },
                },
              ],
            },
          },
          size: 5,
        },
      });
      console.log(
        `✅ Suggestions: Found ${suggestions.hits.total.value} results`
      );
    } catch (error) {
      console.error("❌ Suggestions failed:", error.message);
    }

    // 6. Test highlighting
    console.log("\n6️⃣ Testing highlighting...");
    try {
      const highlightSearch = await es.search({
        index: ["indian_judgments_index", "indian_law_index"],
        body: {
          query: {
            match: {
              text: "fundamental rights",
            },
          },
          highlight: {
            fields: {
              text: { fragment_size: 150, number_of_fragments: 2 },
            },
          },
          size: 2,
        },
      });
      console.log(
        `✅ Highlighting: Found ${highlightSearch.hits.total.value} results`
      );

      if (highlightSearch.hits.hits.length > 0) {
        const firstHit = highlightSearch.hits.hits[0];
        if (firstHit.highlight && firstHit.highlight.text) {
          console.log("   Sample highlight:");
          console.log(`   ${firstHit.highlight.text[0]}`);
        }
      }
    } catch (error) {
      console.error("❌ Highlighting failed:", error.message);
    }

    // 7. Check MongoDB data
    console.log("\n7️⃣ Checking MongoDB data...");
    try {
      mongoClient = new MongoClient(MONGODB_URI);
      await mongoClient.connect();
      const db = mongoClient.db("indian_law_db");

      const judgmentsCount = await db.collection("judgments").countDocuments();
      const lawsCount = await db.collection("laws").countDocuments();

      console.log(
        `✅ MongoDB data: ${judgmentsCount} judgments, ${lawsCount} laws`
      );
    } catch (error) {
      console.error("❌ MongoDB check failed:", error.message);
    }

    console.log("\n🎉 Elasticsearch testing completed!");
    console.log("\n📋 Next steps:");
    console.log("   1. Run the backend API: npm start");
    console.log(
      "   2. Test search endpoint: curl 'http://localhost:3001/api/search?q=criminal'"
    );
    console.log(
      "   3. Test suggest endpoint: curl 'http://localhost:3001/api/suggest?q=crim'"
    );
    console.log("   4. Open frontend and test search functionality");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
    await es.close();
  }
}

// Run the test
testElasticsearch();

