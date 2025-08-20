const { Client } = require("@elastic/elasticsearch");

// Connect to Elasticsearch (using port 9201 as configured in docker-compose)
const es = new Client({
  node: "http://localhost:9201",
  auth: {
    username: "elastic",
    password: "changeme",
  },
});

async function setupIndices() {
  try {
    console.log("🔍 Setting up Elasticsearch indices...");

    // 1. Create indian_judgments_index
    const judgmentsMapping = {
      mappings: {
        properties: {
          id: { type: "keyword" },
          case_title: {
            type: "text",
            analyzer: "english",
            fields: {
              keyword: { type: "keyword" },
            },
          },
          court: { type: "keyword" },
          judges: { type: "keyword" },
          date: { type: "date" },
          citation: { type: "keyword" },
          text: {
            type: "text",
            analyzer: "english",
          },
          summary: {
            type: "text",
            analyzer: "english",
          },
          referenced_sections: { type: "keyword" },
          tags: { type: "keyword" },
          created_at: { type: "date" },
        },
      },
    };

    try {
      await es.indices.create({
        index: "indian_judgments_index",
        body: judgmentsMapping,
      });
      console.log("✅ Created indian_judgments_index");
    } catch (error) {
      if (error.message.includes("resource_already_exists")) {
        console.log("ℹ️  indian_judgments_index already exists");
      } else {
        throw error;
      }
    }

    // 2. Create indian_law_index
    const lawMapping = {
      mappings: {
        properties: {
          id: { type: "keyword" },
          act_name: {
            type: "text",
            analyzer: "english",
          },
          act_number: { type: "keyword" },
          enactment_date: { type: "date" },
          commencement_date: { type: "date" },
          sections: {
            type: "nested",
            properties: {
              section_number: { type: "keyword" },
              title: {
                type: "text",
                analyzer: "english",
              },
              content: {
                type: "text",
                analyzer: "english",
              },
              punishment: { type: "text" },
            },
          },
          tags: { type: "keyword" },
          created_at: { type: "date" },
        },
      },
    };

    try {
      await es.indices.create({
        index: "indian_law_index",
        body: lawMapping,
      });
      console.log("✅ Created indian_law_index");
    } catch (error) {
      if (error.message.includes("resource_already_exists")) {
        console.log("ℹ️  indian_law_index already exists");
      } else {
        throw error;
      }
    }

    // 3. Check indices status
    const indices = await es.cat.indices({ format: "json" });
    console.log("\n📊 Current indices:");
    indices.forEach((index) => {
      console.log(
        `  - ${index.index} (docs: ${index["docs.count"]}, size: ${index["store.size"]})`
      );
    });

    console.log("\n🎉 Elasticsearch setup completed successfully!");
  } catch (error) {
    console.error("❌ Error setting up Elasticsearch:", error);
  } finally {
    await es.close();
  }
}

// Run the setup
setupIndices();

