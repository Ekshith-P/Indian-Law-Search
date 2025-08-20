// MongoDB initialization script for Indian Law Search
db = db.getSiblingDB("indian_law_db");

// Create collections
db.createCollection("laws");
db.createCollection("cases");
db.createCollection("judgments");
db.createCollection("articles");

// Create indexes for better search performance
db.laws.createIndex({ title: "text", content: "text" });
db.laws.createIndex({ act_name: 1 });
db.laws.createIndex({ year: 1 });

db.cases.createIndex({ case_title: "text", summary: "text" });
db.cases.createIndex({ court: 1 });
db.cases.createIndex({ date: 1 });

db.judgments.createIndex({ title: "text", content: "text" });
db.judgments.createIndex({ court: 1 });
db.judgments.createIndex({ date: 1 });

db.articles.createIndex({ title: "text", content: "text" });
db.articles.createIndex({ author: 1 });
db.articles.createIndex({ date: 1 });

print("MongoDB initialization completed successfully!");
