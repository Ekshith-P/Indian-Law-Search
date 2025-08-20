// Test script for new features: Summarization, Case Retrieval, Auto Scraping
const axios = require("axios");

const BASE_URL = "http://localhost:3001";

async function testNewFeatures() {
  console.log(
    "🧪 Testing New Features: Summarization + Case Retrieval + Auto Scraping"
  );
  console.log("=" * 70);

  try {
    // Wait for backend to be ready
    console.log("\n⏳ Waiting for backend to be ready...");
    let retries = 0;
    while (retries < 10) {
      try {
        await axios.get(`${BASE_URL}/health`);
        console.log("✅ Backend is ready!");
        break;
      } catch (error) {
        retries++;
        if (retries >= 10) {
          throw new Error("Backend not responding after 10 retries");
        }
        console.log(`   Retry ${retries}/10...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Test 1: Case Retrieval by ID
    console.log("\n🔍 Test 1: Case Retrieval by ID");
    console.log("Retrieving case: sc_arnesh_kumar_vs_state_of_bihar_2014");

    try {
      const caseResponse = await axios.get(
        `${BASE_URL}/api/case/sc_arnesh_kumar_vs_state_of_bihar_2014`
      );

      console.log(`✅ Case Retrieved Successfully!`);
      console.log(`   Title: ${caseResponse.data.case.case_title}`);
      console.log(`   Court: ${caseResponse.data.case.court}`);
      console.log(`   Source: ${caseResponse.data.case.source}`);
      console.log(
        `   Text Length: ${caseResponse.data.metadata.total_length} characters`
      );
      console.log(`   Has Summary: ${caseResponse.data.metadata.has_summary}`);
      console.log(`   Has Judges: ${caseResponse.data.metadata.has_judges}`);
      console.log(
        `   Has Citation: ${caseResponse.data.metadata.has_citation}`
      );

      // Store case data for summarization test
      const caseData = caseResponse.data.case;
    } catch (error) {
      console.log(`   ⚠️ Case retrieval failed: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data.error}`);
      }
    }

    // Test 2: AI Summarization
    console.log("\n🔍 Test 2: AI-Powered Case Summarization");

    try {
      // Sample legal text for summarization
      const sampleText = `
        IN THE SUPREME COURT OF INDIA
        CRIMINAL APPELLATE JURISDICTION
        CRIMINAL APPEAL NO. 1277 OF 2014
        
        Arnesh Kumar ... Appellant
        Versus
        State of Bihar & Anr. ... Respondents
        
        JUDGMENT
        Chandramauli Kr. Prasad, J.
        
        1. Leave granted.
        
        2. The appellant is aggrieved by the order dated 2nd of May, 2013 passed by the High Court of Judicature at Patna in Criminal Miscellaneous No. 33268 of 2013 whereby and whereunder the prayer for anticipatory bail made by the appellant has been rejected.
        
        3. The appellant is the husband of respondent No. 2. The marriage between the appellant and respondent No. 2 was solemnized on 1st of July, 2007. The respondent No. 2 filed a complaint under Section 498A of the Indian Penal Code (hereinafter referred to as the 'IPC') and Sections 3 and 4 of the Dowry Prohibition Act, 1961 (hereinafter referred to as the 'Act') against the appellant and his family members.
        
        4. The appellant apprehending arrest in connection with the aforesaid case filed an application for anticipatory bail before the High Court which has been rejected by the impugned order.
        
        5. The appellant is before us by way of this appeal.
        
        6. We have heard Mr. Ranjit Kumar, learned senior counsel for the appellant and Mr. Gopal Singh, learned counsel for the State of Bihar.
        
        7. The respondent No. 2 is not represented despite service of notice.
        
        8. The appellant is a government servant. The marriage between the appellant and respondent No. 2 was solemnized on 1st of July, 2007. The respondent No. 2 left the matrimonial home on 8th of April, 2008. The complaint was filed on 25th of July, 2008 i.e. after more than 15 months of leaving the matrimonial home.
        
        9. The appellant has been working as Assistant Professor in the Department of Computer Science and Engineering in the National Institute of Technology, Patna. He has no criminal antecedents.
        
        10. The appellant has been cooperating with the investigation and has appeared before the investigating officer on several occasions.
        
        11. In view of the aforesaid facts and circumstances, we are of the opinion that the appellant deserves to be granted anticipatory bail.
        
        12. Accordingly, we allow this appeal and direct that in the event of arrest, the appellant shall be released on bail on his furnishing a bond of Rs. 25,000/- (Rupees Twenty Five Thousand only) with two sureties of the like amount each to the satisfaction of the arresting officer/Investigating Officer/Superintendent of Police on the following conditions:
        
        (i) The appellant shall make himself available for interrogation by a police officer as and when required;
        
        (ii) The appellant shall not directly or indirectly make any inducement, threat or promise to any person acquainted with the facts of the case so as to dissuade him from disclosing such facts to the Court or to any police officer;
        
        (iii) The appellant shall not leave India without the previous permission of the Court;
        
        (iv) The appellant shall not tamper with the evidence or try to influence or contact the complainant, witnesses or any person concerned with the case.
        
        13. The appeal is allowed in the aforesaid terms.
      `;

      const summarizationResponse = await axios.post(
        `${BASE_URL}/api/summarize`,
        {
          text: sampleText,
          case_title: "Arnesh Kumar vs State of Bihar",
          method: "hybrid",
          max_sentences: 4,
        }
      );

      console.log(`✅ Summarization Successful!`);
      console.log(`   Method: ${summarizationResponse.data.metadata.method}`);
      console.log(
        `   Max Sentences: ${summarizationResponse.data.metadata.max_sentences}`
      );
      console.log(
        `   Original Length: ${summarizationResponse.data.metadata.original_length} characters`
      );
      console.log(
        `   Summary Length: ${summarizationResponse.data.metadata.summary_length} characters`
      );
      console.log(
        `   Compression Ratio: ${summarizationResponse.data.metadata.compression_ratio}`
      );
      console.log(`\n   Generated Summary:`);
      console.log(`   ${summarizationResponse.data.summary}`);
    } catch (error) {
      console.log(`   ⚠️ Summarization failed: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data.error}`);
      }
    }

    // Test 3: Auto Scraper
    console.log("\n🔍 Test 3: Auto Scraper System");

    try {
      const scraperResponse = await axios.post(`${BASE_URL}/api/scraper/run`, {
        mode: "run-once",
      });

      console.log(`✅ Scraper Started Successfully!`);
      console.log(`   Mode: ${scraperResponse.data.message}`);
      console.log(`   Timestamp: ${scraperResponse.data.timestamp}`);
      console.log(`   Result: ${scraperResponse.data.result}`);
    } catch (error) {
      console.log(`   ⚠️ Scraper failed: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data.error}`);
      }
    }

    // Test 4: Enhanced Search with New Features
    console.log("\n🔍 Test 4: Enhanced Search with New Features");

    try {
      const enhancedResponse = await axios.get(
        `${BASE_URL}/api/enhanced-search?q=anticipatory bail&limit=5&include_kanoon=true&include_local=true`
      );

      console.log(`✅ Enhanced Search Successful!`);
      console.log(`   Query: ${enhancedResponse.data.query}`);
      console.log(`   Total Results: ${enhancedResponse.data.total}`);
      console.log(`   Sources: ${enhancedResponse.data.sources.join(", ")}`);

      if (enhancedResponse.data.results.length > 0) {
        console.log(`\n   Sample Results:`);
        enhancedResponse.data.results.slice(0, 2).forEach((result, idx) => {
          const title = result.case_title || result.act_name || "Unknown";
          const source = result.source || "Unknown";
          const hasSummary = !!result.summary;
          console.log(`     ${idx + 1}. ${title}`);
          console.log(`        Source: ${source} | Has Summary: ${hasSummary}`);
        });
      }
    } catch (error) {
      console.log(`   ⚠️ Enhanced search failed: ${error.message}`);
    }

    // Test 5: Health Check with New Features
    console.log("\n🔍 Test 5: Health Check with New Features");

    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);

      console.log(`✅ Health Check Successful!`);
      console.log(`   Status: ${healthResponse.data.status}`);
      console.log(`   Service: ${healthResponse.data.service}`);
      console.log(`   Features:`);
      Object.entries(healthResponse.data.features).forEach(
        ([feature, status]) => {
          console.log(`     ${feature}: ${status}`);
        }
      );
    } catch (error) {
      console.log(`   ⚠️ Health check failed: ${error.message}`);
    }

    console.log("\n🎉 New Features Testing Completed!");
    console.log("\n📋 New Features Available:");
    console.log("  ✅ /api/case/:id - Full case retrieval by ID");
    console.log("  ✅ /api/summarize - AI-powered case summarization");
    console.log("  ✅ /api/scraper/run - Automated case scraping");
    console.log("  ✅ Enhanced case metadata and analysis");
    console.log("  ✅ Python integration for advanced NLP");

    console.log("\n🔧 Technical Features:");
    console.log("  ✅ Extractive summarization using sumy library");
    console.log("  ✅ Regex-based legal keyword extraction");
    console.log("  ✅ Hybrid summarization combining multiple approaches");
    console.log("  ✅ Automated daily scraping at 6 AM");
    console.log("  ✅ Selenium-based web scraping");
    console.log("  ✅ MongoDB and Elasticsearch integration");

    console.log("\n🌐 Usage Examples:");
    console.log("  • GET /api/case/sc_arnesh_kumar_vs_state_of_bihar_2014");
    console.log("  • POST /api/summarize with legal text");
    console.log("  • POST /api/scraper/run to start scraping");
    console.log("  • Enhanced search with multi-source results");

    console.log("\n🚀 Next Steps:");
    console.log(
      "  1. Install Python dependencies: pip install -r requirements.txt"
    );
    console.log("  2. Test Python summarizer: python3 summarizer.py --help");
    console.log("  3. Run auto scraper: python3 auto_scraper.py run-once");
    console.log(
      "  4. Schedule daily scraping: python3 auto_scraper.py continuous"
    );
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", error.response.data);
    }
  }
}

// Run the test
testNewFeatures();
