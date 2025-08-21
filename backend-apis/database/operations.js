const mongoose = require("mongoose");
const { Client } = require("@elastic/elasticsearch");

// MongoDB Connection
let mongoClient = null;
let esClient = null;

// Initialize MongoDB connection
async function connectMongoDB() {
  try {
    if (!mongoClient) {
      const mongoUri =
        process.env.MONGODB_URI || "mongodb://localhost:27017/indian_law_db";
      mongoClient = await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("✅ MongoDB connected successfully");
    }
    return mongoClient;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    return null;
  }
}

// Initialize Elasticsearch connection
async function connectElasticsearch() {
  try {
    if (!esClient) {
      const esUrl = process.env.ELASTICSEARCH_URL || "http://localhost:9200";
      esClient = new Client({
        node: esUrl,
        auth: {
          username: process.env.ELASTICSEARCH_USERNAME || "",
          password: process.env.ELASTICSEARCH_PASSWORD || "",
        },
      });

      // Test connection
      await esClient.ping();
      console.log("✅ Elasticsearch connected successfully");
    }
    return esClient;
  } catch (error) {
    console.error("❌ Elasticsearch connection error:", error.message);
    return null;
  }
}

// Judgment Schema
const judgmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  case_title: { type: String, required: true },
  court: { type: String, required: true },
  judges: [{ type: String }],
  date: { type: String, required: true },
  citation: { type: String },
  pdf_url: { type: String },
  text: { type: String },
  summary: { type: String },
  referenced_sections: [{ type: String }],
  tags: [{ type: String }],
  source_url: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Legislation Schema
const legislationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  act_name: { type: String, required: true },
  section: { type: String },
  content: { type: String, required: true },
  category: { type: String },
  tags: [{ type: String }],
  created_at: { type: Date, default: Date.now },
});

// Create models
const Judgment = mongoose.model("Judgment", judgmentSchema);
const Legislation = mongoose.model("Legislation", legislationSchema);

// Save judgment to MongoDB
async function saveToDatabase(judgment) {
  try {
    await connectMongoDB();

    // Check if judgment already exists
    const existing = await Judgment.findOne({ id: judgment.id });
    if (existing) {
      console.log(`⚠️ Judgment ${judgment.id} already exists, updating...`);
      await Judgment.findOneAndUpdate(
        { id: judgment.id },
        { ...judgment, updated_at: new Date() },
        { new: true }
      );
    } else {
      await Judgment.create(judgment);
      console.log(`✅ Saved judgment: ${judgment.id}`);
    }

    return true;
  } catch (error) {
    console.error("❌ Error saving to database:", error.message);
    return false;
  }
}

// Index judgment to Elasticsearch
async function indexToElasticsearch(judgment) {
  try {
    const es = await connectElasticsearch();
    if (!es) {
      console.log("⚠️ Elasticsearch not available, skipping indexing");
      return false;
    }

    const indexName = "indian_judgments_index";

    // Prepare document for indexing
    const document = {
      id: judgment.id,
      case_title: judgment.case_title,
      court: judgment.court,
      judges: judgment.judges,
      date: judgment.date,
      citation: judgment.citation,
      text: judgment.text,
      summary: judgment.summary,
      referenced_sections: judgment.referenced_sections,
      tags: judgment.tags,
      source_url: judgment.source_url,
      created_at: judgment.created_at,
    };

    await es.index({
      index: indexName,
      id: judgment.id,
      body: document,
    });

    console.log(`✅ Indexed judgment: ${judgment.id}`);
    return true;
  } catch (error) {
    console.error("❌ Error indexing to Elasticsearch:", error.message);
    return false;
  }
}

// Search judgments in MongoDB
async function searchJudgments(query, filters = {}) {
  try {
    await connectMongoDB();

    const searchQuery = {
      $or: [
        { case_title: { $regex: query, $options: "i" } },
        { text: { $regex: query, $options: "i" } },
        { summary: { $regex: query, $options: "i" } },
        { tags: { $in: [new RegExp(query, "i")] } },
      ],
    };

    // Apply filters
    if (filters.court) {
      searchQuery.court = { $regex: filters.court, $options: "i" };
    }
    if (filters.dateFrom || filters.dateTo) {
      searchQuery.date = {};
      if (filters.dateFrom) searchQuery.date.$gte = filters.dateFrom;
      if (filters.dateTo) searchQuery.date.$lte = filters.dateTo;
    }

    const judgments = await Judgment.find(searchQuery)
      .sort({ date: -1 })
      .limit(filters.limit || 50);

    return judgments;
  } catch (error) {
    console.error("❌ Error searching judgments:", error.message);
    return [];
  }
}

// Search in Elasticsearch
async function searchElasticsearch(query, filters = {}) {
  try {
    const es = await connectElasticsearch();
    if (!es) {
      console.log("⚠️ Elasticsearch not available, using MongoDB search");
      return await searchJudgments(query, filters);
    }

    const indexName = "indian_judgments_index";

    const searchBody = {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: query,
                fields: ["case_title^3", "text^2", "summary^2", "tags"],
                type: "best_fields",
                fuzziness: "AUTO",
              },
            },
          ],
          filter: [],
        },
      },
      sort: [{ date: { order: "desc" } }, { _score: { order: "desc" } }],
      size: filters.limit || 50,
    };

    // Apply filters
    if (filters.court) {
      searchBody.query.bool.filter.push({
        term: { court: filters.court },
      });
    }
    if (filters.dateFrom || filters.dateTo) {
      const dateFilter = { range: { date: {} } };
      if (filters.dateFrom) dateFilter.range.date.gte = filters.dateFrom;
      if (filters.dateTo) dateFilter.range.date.lte = filters.dateTo;
      searchBody.query.bool.filter.push(dateFilter);
    }

    const response = await es.search({
      index: indexName,
      body: searchBody,
    });

    return response.body.hits.hits.map((hit) => ({
      ...hit._source,
      score: hit._score,
    }));
  } catch (error) {
    console.error("❌ Error searching Elasticsearch:", error.message);
    return await searchJudgments(query, filters);
  }
}

// Get judgment by ID
async function getJudgmentById(id) {
  try {
    await connectMongoDB();
    const judgment = await Judgment.findOne({ id });
    return judgment;
  } catch (error) {
    console.error("❌ Error getting judgment by ID:", error.message);
    return null;
  }
}

// Get recent judgments
async function getRecentJudgments(limit = 10) {
  try {
    await connectMongoDB();
    const judgments = await Judgment.find().sort({ date: -1 }).limit(limit);
    return judgments;
  } catch (error) {
    console.error("❌ Error getting recent judgments:", error.message);
    return [];
  }
}

// Get judgments by court
async function getJudgmentsByCourt(court, limit = 20) {
  try {
    await connectMongoDB();
    const judgments = await Judgment.find({ court })
      .sort({ date: -1 })
      .limit(limit);
    return judgments;
  } catch (error) {
    console.error("❌ Error getting judgments by court:", error.message);
    return [];
  }
}

// Save legislation to database
async function saveLegislation(legislation) {
  try {
    await connectMongoDB();

    const existing = await Legislation.findOne({ id: legislation.id });
    if (existing) {
      await Legislation.findOneAndUpdate({ id: legislation.id }, legislation, {
        new: true,
      });
    } else {
      await Legislation.create(legislation);
    }

    return true;
  } catch (error) {
    console.error("❌ Error saving legislation:", error.message);
    return false;
  }
}

// Search legislation
async function searchLegislation(query, filters = {}) {
  try {
    await connectMongoDB();

    const searchQuery = {
      $or: [
        { title: { $regex: query, $options: "i" } },
        { act_name: { $regex: query, $options: "i" } },
        { content: { $regex: query, $options: "i" } },
        { tags: { $in: [new RegExp(query, "i")] } },
      ],
    };

    if (filters.category) {
      searchQuery.category = filters.category;
    }

    const legislation = await Legislation.find(searchQuery)
      .sort({ title: 1 })
      .limit(filters.limit || 50);

    return legislation;
  } catch (error) {
    console.error("❌ Error searching legislation:", error.message);
    return [];
  }
}

// Get database statistics
async function getDatabaseStats() {
  try {
    await connectMongoDB();

    const totalJudgments = await Judgment.countDocuments();
    const totalLegislation = await Legislation.countDocuments();
    const courts = await Judgment.distinct("court");
    const recentJudgments = await Judgment.find()
      .sort({ created_at: -1 })
      .limit(5)
      .select("case_title court date");

    return {
      totalJudgments,
      totalLegislation,
      courts,
      recentJudgments,
    };
  } catch (error) {
    console.error("❌ Error getting database stats:", error.message);
    return {
      totalJudgments: 0,
      totalLegislation: 0,
      courts: [],
      recentJudgments: [],
    };
  }
}

module.exports = {
  connectMongoDB,
  connectElasticsearch,
  saveToDatabase,
  indexToElasticsearch,
  searchJudgments,
  searchElasticsearch,
  getJudgmentById,
  getRecentJudgments,
  getJudgmentsByCourt,
  saveLegislation,
  searchLegislation,
  getDatabaseStats,
  Judgment,
  Legislation,
};
