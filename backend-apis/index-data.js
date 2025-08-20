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

async function indexData() {
  let mongoClient = null;

  try {
    console.log("🔄 Starting data indexing from MongoDB to Elasticsearch...");

    // Connect to MongoDB
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db("indian_law_db");
    console.log("✅ Connected to MongoDB");

    // 1. Index judgments
    console.log("\n📄 Indexing judgments...");
    const judgments = await db.collection("judgments").find({}).toArray();
    console.log(`Found ${judgments.length} judgments to index`);

    for (const judgment of judgments) {
      try {
        // Prepare document for Elasticsearch
        const esDoc = {
          id: judgment.id,
          case_title: judgment.case_title,
          court: judgment.court,
          judges: judgment.judges || [],
          date: judgment.date,
          citation: judgment.citation,
          text: judgment.text,
          summary: judgment.summary,
          referenced_sections: judgment.referenced_sections || [],
          tags: judgment.tags || [],
          created_at: judgment.created_at || new Date().toISOString(),
        };

        await es.index({
          index: "indian_judgments_index",
          id: judgment.id,
          body: esDoc,
        });

        console.log(`  ✅ Indexed: ${judgment.case_title}`);
      } catch (error) {
        console.error(
          `  ❌ Failed to index ${judgment.case_title}:`,
          error.message
        );
      }
    }

    // 2. Index laws (if any exist)
    console.log("\n📚 Indexing laws...");
    const laws = await db.collection("laws").find({}).toArray();
    console.log(`Found ${laws.length} laws to index`);

    for (const law of laws) {
      try {
        const esDoc = {
          id: law.id,
          act_name: law.act_name,
          act_number: law.act_number,
          enactment_date: law.enactment_date,
          commencement_date: law.commencement_date,
          sections: law.sections || [],
          tags: law.tags || [],
          created_at: law.created_at || new Date().toISOString(),
        };

        await es.index({
          index: "indian_law_index",
          id: law.id,
          body: esDoc,
        });

        console.log(`  ✅ Indexed: ${law.act_name}`);
      } catch (error) {
        console.error(`  ❌ Failed to index ${law.act_name}:`, error.message);
      }
    }

    // 3. Refresh indices to make documents searchable
    await es.indices.refresh({ index: "indian_judgments_index" });
    await es.indices.refresh({ index: "indian_law_index" });

    // 4. Check final counts
    const judgmentsCount = await es.count({ index: "indian_judgments_index" });
    const lawsCount = await es.count({ index: "indian_law_index" });

    console.log("\n📊 Indexing completed!");
    console.log(
      `  - indian_judgments_index: ${judgmentsCount.count} documents`
    );
    console.log(`  - indian_law_index: ${lawsCount.count} documents`);
  } catch (error) {
    console.error("❌ Error during indexing:", error);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
    await es.close();
  }
}

// Run the indexing
indexData();

