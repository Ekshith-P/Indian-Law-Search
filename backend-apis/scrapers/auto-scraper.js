const cron = require("node-cron");
const SupremeCourtScraper = require("./supreme-court-scraper");
const HighCourtScraper = require("./high-court-scraper");
const {
  saveToDatabase,
  indexToElasticsearch,
} = require("../database/operations");

class AutoScraper {
  constructor() {
    this.scSupremeCourt = new SupremeCourtScraper();
    this.scHighCourt = new HighCourtScraper();
    this.isRunning = false;
  }

  async initialize() {
    try {
      console.log("🚀 Initializing Auto Scraper...");

      // Schedule daily scraping at 6 AM
      cron.schedule(
        "0 6 * * *",
        async () => {
          console.log(
            "⏰ Scheduled scraping started at:",
            new Date().toISOString()
          );
          await this.runDailyScraping();
        },
        {
          scheduled: true,
          timezone: "Asia/Kolkata",
        }
      );

      // Schedule weekly scraping on Sundays at 2 AM
      cron.schedule(
        "0 2 * * 0",
        async () => {
          console.log(
            "⏰ Weekly deep scraping started at:",
            new Date().toISOString()
          );
          await this.runWeeklyScraping();
        },
        {
          scheduled: true,
          timezone: "Asia/Kolkata",
        }
      );

      console.log("✅ Auto Scraper initialized with schedules");
      console.log("📅 Daily scraping: 6:00 AM IST");
      console.log("📅 Weekly scraping: Sunday 2:00 AM IST");
    } catch (error) {
      console.error("❌ Error initializing auto scraper:", error.message);
    }
  }

  async runDailyScraping() {
    if (this.isRunning) {
      console.log("⚠️ Scraping already in progress, skipping...");
      return;
    }

    this.isRunning = true;
    console.log("🔍 Starting daily scraping...");

    try {
      const startTime = Date.now();
      let totalScraped = 0;

      // Scrape Supreme Court judgments
      console.log("🏛️ Scraping Supreme Court judgments...");
      const scJudgments = await this.scSupremeCourt.runScraping();
      if (scJudgments.length > 0) {
        await this.saveJudgments(scJudgments, "Supreme Court");
        totalScraped += scJudgments.length;
      }

      // Scrape High Court judgments
      console.log("⚖️ Scraping High Court judgments...");
      const hcJudgments = await this.scHighCourt.runScraping();
      if (hcJudgments.length > 0) {
        await this.saveJudgments(hcJudgments, "High Court");
        totalScraped += hcJudgments.length;
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Daily scraping completed in ${duration}ms`);
      console.log(`📊 Total judgments scraped: ${totalScraped}`);
    } catch (error) {
      console.error("❌ Error in daily scraping:", error.message);
    } finally {
      this.isRunning = false;
    }
  }

  async runWeeklyScraping() {
    if (this.isRunning) {
      console.log("⚠️ Scraping already in progress, skipping...");
      return;
    }

    this.isRunning = true;
    console.log("🔍 Starting weekly deep scraping...");

    try {
      const startTime = Date.now();
      let totalScraped = 0;

      // Deep scrape with more comprehensive data
      console.log("🏛️ Deep scraping Supreme Court judgments...");
      const scJudgments = await this.scSupremeCourt.runScraping(20); // More judgments
      if (scJudgments.length > 0) {
        await this.saveJudgments(scJudgments, "Supreme Court");
        totalScraped += scJudgments.length;
      }

      // Deep scrape High Courts
      console.log("⚖️ Deep scraping High Court judgments...");
      const hcJudgments = await this.scHighCourt.runScraping(30); // More judgments
      if (hcJudgments.length > 0) {
        await this.saveJudgments(hcJudgments, "High Court");
        totalScraped += hcJudgments.length;
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Weekly scraping completed in ${duration}ms`);
      console.log(`📊 Total judgments scraped: ${totalScraped}`);
    } catch (error) {
      console.error("❌ Error in weekly scraping:", error.message);
    } finally {
      this.isRunning = false;
    }
  }

  async saveJudgments(judgments, courtType) {
    try {
      console.log(`💾 Saving ${judgments.length} ${courtType} judgments...`);

      for (const judgment of judgments) {
        // Save to database
        await saveToDatabase(judgment);

        // Index to Elasticsearch
        await indexToElasticsearch(judgment);
      }

      console.log(
        `✅ Successfully saved ${judgments.length} ${courtType} judgments`
      );
    } catch (error) {
      console.error(`❌ Error saving ${courtType} judgments:`, error.message);
    }
  }

  async runManualScraping(limit = 10) {
    console.log(`🔍 Running manual scraping (limit: ${limit})...`);

    try {
      const startTime = Date.now();
      let totalScraped = 0;

      // Scrape Supreme Court
      const scJudgments = await this.scSupremeCourt.runScraping(limit);
      if (scJudgments.length > 0) {
        await this.saveJudgments(scJudgments, "Supreme Court");
        totalScraped += scJudgments.length;
      }

      // Scrape High Courts
      const hcJudgments = await this.scHighCourt.runScraping(limit);
      if (hcJudgments.length > 0) {
        await this.saveJudgments(hcJudgments, "High Court");
        totalScraped += hcJudgments.length;
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Manual scraping completed in ${duration}ms`);
      console.log(`📊 Total judgments scraped: ${totalScraped}`);

      return {
        success: true,
        totalScraped,
        duration,
        message: `Successfully scraped ${totalScraped} judgments`,
      };
    } catch (error) {
      console.error("❌ Error in manual scraping:", error.message);
      return {
        success: false,
        error: error.message,
        message: "Scraping failed",
      };
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: new Date().toISOString(),
      schedules: {
        daily: "0 6 * * * (6:00 AM IST)",
        weekly: "0 2 * * 0 (Sunday 2:00 AM IST)",
      },
    };
  }

  stop() {
    console.log("🛑 Stopping auto scraper...");
    // Stop all cron jobs
    cron.getTasks().forEach((task) => task.stop());
    this.isRunning = false;
    console.log("✅ Auto scraper stopped");
  }
}

module.exports = AutoScraper;
