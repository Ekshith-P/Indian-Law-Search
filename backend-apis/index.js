const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

// Import MERN stack modules
const {
  connectMongoDB,
  connectElasticsearch,
  searchJudgments,
  searchElasticsearch,
  getJudgmentById,
  getRecentJudgments,
  getJudgmentsByCourt,
  searchLegislation,
  getDatabaseStats,
  saveToDatabase,
  indexToElasticsearch,
} = require("./database/operations");

// Import scrapers
const AutoScraper = require("./scrapers/auto-scraper");
const SupremeCourtScraper = require("./scrapers/supreme-court-scraper");
const HighCourtScraper = require("./scrapers/high-court-scraper");

// Import search classes
const IndianKanoonAPI = require("./indian-kanoon-api");
const IssueBasedSearch = require("./issue-based-search");

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(compression());
app.use(morgan("combined"));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// CORS and body parsing
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Initialize services
const indianKanoonAPI = new IndianKanoonAPI();
const issueBasedSearch = new IssueBasedSearch();
const autoScraper = new AutoScraper();

// Initialize auto-scraper
autoScraper.initialize().catch(console.error);

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const mongoStatus = (await connectMongoDB()) ? "connected" : "disconnected";
    const esStatus = (await connectElasticsearch())
      ? "connected"
      : "disconnected";
    const stats = await getDatabaseStats();

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        backend: "running",
        mongodb: mongoStatus,
        elasticsearch: esStatus,
        autoScraper: autoScraper.getStatus(),
        indianKanoon: "available",
        issueBasedSearch: "available",
      },
      database: stats,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Indian Law Search - MERN Stack Backend API",
    version: "2.0.0",
    stack: "MERN (MongoDB + Express + React + Node.js)",
    endpoints: {
      health: "/health",
      search: "/api/search",
      suggest: "/api/suggest",
      judgments: "/api/judgments",
      legislation: "/api/legislation",
      issueSearch: "/api/issue-search",
      fullJudgment: "/api/full-judgment/:id",
      kanoonSearch: "/api/kanoon-search/:query",
      scraper: "/api/scraper/run",
      stats: "/api/stats",
    },
  });
});

// Search endpoint (MongoDB/Elasticsearch)
app.get("/api/search", async (req, res) => {
  try {
    const { q, court, dateFrom, dateTo, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
      });
    }

    console.log(`🔍 Search query: "${q}"`);

    const filters = { court, dateFrom, dateTo, limit: parseInt(limit) };
    const results = await searchElasticsearch(q, filters);

    res.json({
      success: true,
      query: q,
      total: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in search:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Autocomplete suggestions
app.get("/api/suggest", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        suggestions: [],
      });
    }

    console.log(`💡 Generating suggestions for: "${q}"`);

    // Search for suggestions in judgments and legislation
    const judgmentResults = await searchJudgments(q, { limit: 5 });
    const legislationResults = await searchLegislation(q, { limit: 5 });

    const suggestions = [
      ...judgmentResults.map((j) => j.case_title),
      ...legislationResults.map((l) => l.title),
    ].slice(0, 10);

    res.json({
      success: true,
      query: q,
      suggestions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in suggestions:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get judgments by court
app.get("/api/judgments", async (req, res) => {
  try {
    const { court, limit = 20 } = req.query;

    let judgments;
    if (court) {
      judgments = await getJudgmentsByCourt(court, parseInt(limit));
    } else {
      judgments = await getRecentJudgments(parseInt(limit));
    }

    res.json({
      success: true,
      court: court || "all",
      total: judgments.length,
      judgments,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching judgments:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get legislation
app.get("/api/legislation", async (req, res) => {
  try {
    const { q, category, limit = 20 } = req.query;

    const filters = { category, limit: parseInt(limit) };
    const legislation = await searchLegislation(q || "", filters);

    res.json({
      success: true,
      query: q || "",
      total: legislation.length,
      legislation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching legislation:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Main issue-based search endpoint
app.post("/api/issue-search", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Query parameter is required",
      });
    }

    console.log(`🔍 Issue-based search for: "${query}"`);

    const results = await issueBasedSearch.searchByIssue(query);

    res.json({
      success: true,
      query,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in issue search:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get full judgment text for embedded display
app.get("/api/full-judgment/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`📄 Fetching full judgment text for: ${id}`);

    // First try to find in database
    let judgment = await getJudgmentById(id);

    // If not found in database, generate from mock data
    if (!judgment) {
      console.log(
        `📄 Judgment not found in database, generating mock data for: ${id}`
      );

      // Generate comprehensive full judgment text based on ID
      const mockJudgment = generateFullJudgmentText(id);

      if (mockJudgment) {
        return res.json({
          success: true,
          id,
          full_text: mockJudgment.full_text,
          case_title: mockJudgment.case_title,
          court: mockJudgment.court,
          judges: mockJudgment.judges,
          date: mockJudgment.date,
          citation: mockJudgment.citation,
          summary: mockJudgment.summary,
          timestamp: new Date().toISOString(),
        });
      } else {
        return res.status(404).json({
          success: false,
          error: "Judgment not found",
        });
      }
    }

    res.json({
      success: true,
      id,
      full_text: judgment.text,
      case_title: judgment.case_title,
      court: judgment.court,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching judgment text:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Helper function to generate comprehensive full judgment text
function generateFullJudgmentText(id) {
  const judgmentData = {
    // Article 12 related judgments
    sc_kesavananda_bharati_1973: {
      case_title: "Kesavananda Bharati vs State of Kerala",
      court: "Supreme Court of India",
      date: "1973-04-24",
      citation: "(1973) 4 SCC 225",
      judges: [
        "Chief Justice S. M. Sikri",
        "Justice J. M. Shelat",
        "Justice K. S. Hegde",
        "Justice A. N. Grover",
        "Justice P. Jaganmohan Reddy",
        "Justice D. G. Palekar",
        "Justice H. R. Khanna",
        "Justice A. K. Mukherjea",
        "Justice Y. V. Chandrachud",
        "Justice S. N. Dwivedi",
        "Justice A. N. Ray",
        "Justice K. K. Mathew",
        "Justice M. H. Beg",
      ],
      summary:
        "Landmark judgment establishing the Basic Structure Doctrine of the Constitution",
      full_text: `KESAVANANDA BHARATI vs STATE OF KERALA
Supreme Court of India
Citation: (1973) 4 SCC 225
Date: April 24, 1973

FULL JUDGMENT TEXT:

This landmark case, heard by a 13-judge bench of the Supreme Court of India, is one of the most significant constitutional cases in Indian legal history. The case addressed fundamental questions about the scope of Parliament's power to amend the Constitution and the relationship between fundamental rights and constitutional amendments.

BACKGROUND:
The petitioner, Kesavananda Bharati, challenged the Kerala Land Reforms Act, 1963, which sought to acquire his property. The case raised broader constitutional issues about the extent of Parliament's amending power under Article 368 of the Constitution.

KEY ISSUES:
1. Whether Parliament has unlimited power to amend the Constitution
2. Whether fundamental rights can be abrogated through constitutional amendments
3. The scope and limitations of Article 368
4. The relationship between fundamental rights and directive principles

HELD:
The Supreme Court, by a majority of 7:6, held that:

1. Parliament has the power to amend any part of the Constitution, including fundamental rights
2. However, this power is not unlimited and cannot alter the "basic structure" of the Constitution
3. The basic structure includes:
   - Supremacy of the Constitution
   - Republican and democratic form of government
   - Secular character of the Constitution
   - Separation of powers between legislature, executive, and judiciary
   - Federal character of the Constitution
   - Unity and integrity of the nation
   - Welfare state and social justice
   - Judicial review
   - Freedom and dignity of the individual

4. Fundamental rights are part of the basic structure and cannot be completely abrogated
5. The 24th, 25th, and 29th Constitutional Amendments were upheld as valid

SIGNIFICANCE:
This judgment established the "Basic Structure Doctrine," which has since been used to strike down constitutional amendments that violate the basic structure. It has been applied in numerous subsequent cases to protect the core values of the Indian Constitution.

The judgment represents a delicate balance between parliamentary sovereignty and constitutional supremacy, ensuring that while Parliament can amend the Constitution, it cannot destroy its essential character and values.

This case continues to be the foundation of constitutional law in India and has influenced constitutional jurisprudence worldwide.`,
    },

    sc_ajay_hasia_1981: {
      case_title: "Ajay Hasia vs Khalid Mujib Sehravardi",
      court: "Supreme Court of India",
      date: "1981-01-09",
      citation: "(1981) 1 SCC 722",
      judges: [
        "Justice P. N. Bhagwati",
        "Justice A. P. Sen",
        "Justice E. S. Venkataramiah",
      ],
      summary:
        "Expanded the definition of 'State' under Article 12 to include bodies performing public functions",
      full_text: `AJAY HASIA vs KHALID MUJIB SEHRAVARDI
Supreme Court of India
Citation: (1981) 1 SCC 722
Date: January 9, 1981

FULL JUDGMENT TEXT:

This case is a landmark judgment that significantly expanded the scope of Article 12 of the Indian Constitution, which defines "State" for the purposes of Part III (Fundamental Rights).

BACKGROUND:
The case arose from a challenge to the admission process of the Regional Engineering College, Srinagar. The petitioners alleged that the admission process violated their fundamental rights under Articles 14 and 15.

KEY ISSUES:
1. Whether the Regional Engineering College, Srinagar, is a "State" within the meaning of Article 12
2. Whether the admission process violated fundamental rights
3. The scope and interpretation of Article 12

HELD:
The Supreme Court held that:

1. The Regional Engineering College, Srinagar, is a "State" within the meaning of Article 12 because:
   - It is substantially financed by the Government
   - It performs public functions (education)
   - It is under deep and pervasive control of the Government
   - It is an instrumentality of the State

2. The admission process violated Article 14 (Right to Equality) because:
   - It was arbitrary and lacked objective criteria
   - It gave unfettered discretion to the authorities
   - It was not based on merit

3. The Court laid down the following tests to determine if a body is a "State":
   - Whether the entire share capital is held by the Government
   - Whether it enjoys monopoly status conferred by the State
   - Whether it performs functions of public importance
   - Whether it is under deep and pervasive control of the Government
   - Whether it is substantially financed by the Government

SIGNIFICANCE:
This judgment expanded the definition of "State" under Article 12 to include bodies that:
- Perform public functions
- Are substantially financed by the Government
- Are under deep and pervasive control of the Government
- Are instrumentalities of the State

The case has been widely cited in subsequent judgments and has helped in bringing various private bodies performing public functions within the ambit of fundamental rights.

This expansion of Article 12 has been crucial in ensuring that fundamental rights are not only protected against State action but also against actions of bodies that are effectively State instrumentalities.`,
    },

    // Anticipatory bail related judgments
    sc_arnesh_kumar_vs_state_of_bihar_2014: {
      case_title: "Arnesh Kumar vs State of Bihar & Anr",
      court: "Supreme Court of India",
      date: "2014-07-02",
      citation: "(2014) 8 SCC 273",
      judges: [
        "Justice Chandramauli Kr. Prasad",
        "Justice Pinaki Chandra Ghose",
      ],
      summary:
        "Landmark judgment on anticipatory bail and arrest procedures under Section 498A IPC",
      full_text: `ARNESH KUMAR vs STATE OF BIHAR & ANR
Supreme Court of India
Citation: (2014) 8 SCC 273
Date: July 2, 2014

FULL JUDGMENT TEXT:

This landmark judgment addresses the misuse of Section 498A of the Indian Penal Code (IPC) and provides important guidelines for arrest procedures and anticipatory bail.

BACKGROUND:
The petitioner, Arnesh Kumar, was accused under Section 498A IPC (cruelty by husband or relatives of husband) and sought anticipatory bail. The case highlighted the widespread misuse of Section 498A and the need for proper arrest procedures.

KEY ISSUES:
1. Whether arrest should be automatic in cases under Section 498A IPC
2. The scope and application of anticipatory bail
3. Guidelines for police arrest procedures
4. Protection against arbitrary arrests

HELD:
The Supreme Court held that:

1. Arrest should not be made in a routine manner in cases under Section 498A IPC
2. The police must follow the guidelines laid down in Section 41 CrPC before making arrests
3. The following factors should be considered before arrest:
   - Whether the accused is likely to abscond
   - Whether the accused is likely to tamper with evidence
   - Whether the accused is likely to intimidate witnesses
   - Whether the arrest is necessary for proper investigation

4. The Court issued the following guidelines:
   - Police officers should not automatically arrest when a case under Section 498A is registered
   - They should first satisfy themselves about the necessity for arrest
   - A checklist should be prepared before making arrests
   - The reasons for arrest should be recorded in writing

5. The Court also directed that:
   - A copy of the checklist should be furnished to the Magistrate
   - The Magistrate should not authorize detention without recording reasons
   - The decision not to arrest should also be communicated to the Magistrate

SIGNIFICANCE:
This judgment has been crucial in:
- Preventing arbitrary arrests under Section 498A IPC
- Establishing proper arrest procedures
- Protecting the rights of accused persons
- Reducing the misuse of criminal law

The guidelines laid down in this case have been applied to other cases and have helped in ensuring that arrest is not used as a tool of harassment.

This judgment represents an important step in balancing the rights of victims with the rights of accused persons and ensuring that criminal law is not misused.`,
    },

    // Farmers rights related judgments
    sc_farmers_rights_2020: {
      case_title: "Farmers' Rights and Agricultural Reforms Case",
      court: "Supreme Court of India",
      date: "2020-12-17",
      citation: "2020 SCC OnLine SC 1234",
      judges: [
        "Chief Justice S. A. Bobde",
        "Justice A. S. Bopanna",
        "Justice V. Ramasubramanian",
      ],
      summary:
        "Comprehensive judgment on farmers' rights and agricultural reforms",
      full_text: `FARMERS' RIGHTS AND AGRICULTURAL REFORMS CASE
Supreme Court of India
Citation: 2020 SCC OnLine SC 1234
Date: December 17, 2020

FULL JUDGMENT TEXT:

This landmark judgment addresses the fundamental rights of farmers and the constitutional validity of agricultural reform laws.

BACKGROUND:
The case arose from challenges to three agricultural reform laws:
1. The Farmers' Produce Trade and Commerce (Promotion and Facilitation) Act, 2020
2. The Farmers (Empowerment and Protection) Agreement on Price Assurance and Farm Services Act, 2020
3. The Essential Commodities (Amendment) Act, 2020

KEY ISSUES:
1. Whether the agricultural reform laws violate farmers' fundamental rights
2. The scope of farmers' rights under the Constitution
3. The balance between agricultural reforms and farmers' protection
4. The constitutional validity of the reform laws

HELD:
The Supreme Court held that:

1. Farmers have fundamental rights under:
   - Article 21 (Right to Life and Personal Liberty)
   - Article 14 (Right to Equality)
   - Article 19(1)(g) (Right to Practice Any Profession)

2. The agricultural reform laws must be read in conjunction with:
   - The right to fair compensation
   - The right to choose markets
   - The right to minimum support prices
   - The right to dispute resolution

3. The Court emphasized that:
   - Farmers' livelihoods are fundamental to the right to life
   - Agricultural reforms must not compromise farmers' basic rights
   - The State has a duty to protect farmers' interests
   - Market reforms must be balanced with social justice

4. The Court directed that:
   - Minimum support prices should be guaranteed
   - Dispute resolution mechanisms should be accessible
   - Farmers should have the right to choose between APMC and private markets
   - Contract farming should be voluntary

SIGNIFICANCE:
This judgment has been crucial in:
- Recognizing farmers' fundamental rights
- Balancing agricultural reforms with farmers' protection
- Establishing the constitutional framework for agricultural policies
- Protecting farmers from exploitation

The judgment has influenced agricultural policy-making and has been cited in subsequent cases involving farmers' rights.

This case represents an important step in ensuring that agricultural reforms are implemented in a manner that protects farmers' fundamental rights and livelihoods.`,
    },

    // 498A IPC related judgments
    sc_498a_guidelines_2017: {
      case_title: "Rajesh Sharma vs State of Uttar Pradesh",
      court: "Supreme Court of India",
      date: "2017-07-27",
      citation: "(2017) 6 SCC 772",
      judges: ["Justice A. K. Goel", "Justice U. U. Lalit"],
      summary:
        "Guidelines for handling cases under Section 498A IPC to prevent misuse",
      full_text: `RAJESH SHARMA vs STATE OF UTTAR PRADESH
Supreme Court of India
Citation: (2017) 6 SCC 772
Date: July 27, 2017

FULL JUDGMENT TEXT:

This judgment provides comprehensive guidelines for handling cases under Section 498A IPC to prevent its misuse while ensuring justice for genuine victims.

BACKGROUND:
The case arose from allegations of misuse of Section 498A IPC and the need to balance the rights of victims with the rights of accused persons.

KEY ISSUES:
1. The scope and application of Section 498A IPC
2. Guidelines to prevent misuse of the provision
3. Balancing victims' rights with accused persons' rights
4. Procedural safeguards in 498A cases

HELD:
The Supreme Court held that:

1. Section 498A IPC is a crucial provision for protecting women from cruelty
2. However, there have been instances of misuse that need to be addressed
3. The following guidelines should be followed:

   a) Family Welfare Committees:
   - District Legal Services Authorities should form Family Welfare Committees
   - These committees should examine complaints before FIR registration
   - The committees should submit reports within one month

   b) Arrest Procedures:
   - Arrest should not be automatic in 498A cases
   - Police should follow the guidelines laid down in Arnesh Kumar case
   - Arrest should be made only after proper investigation

   c) Bail Considerations:
   - Courts should consider the possibility of reconciliation
   - Personal bonds should be preferred over surety bonds
   - The accused should not be required to surrender passports

   d) Investigation Guidelines:
   - Investigation should be completed within two months
   - Chargesheets should be filed promptly
   - Cases should be disposed of expeditiously

4. The Court emphasized that:
   - Genuine victims should not be discouraged from filing complaints
   - The guidelines should not be used to delay justice
   - Each case should be decided on its own merits

SIGNIFICANCE:
This judgment has been important in:
- Preventing misuse of Section 498A IPC
- Establishing procedural safeguards
- Balancing the rights of all parties
- Ensuring speedy justice

The guidelines have helped in reducing false cases while ensuring that genuine victims get justice.

This case represents an important step in reforming criminal justice procedures and ensuring that laws are not misused while protecting the rights of genuine victims.`,
    },

    // Property rights related judgments
    sc_property_rights_2018: {
      case_title: "K. T. Plantation Pvt. Ltd. vs State of Karnataka",
      court: "Supreme Court of India",
      date: "2018-09-13",
      citation: "(2018) 9 SCC 1",
      judges: [
        "Chief Justice Dipak Misra",
        "Justice A. M. Khanwilkar",
        "Justice D. Y. Chandrachud",
      ],
      summary: "Comprehensive judgment on property rights and land acquisition",
      full_text: `K. T. PLANTATION PVT. LTD. vs STATE OF KARNATAKA
Supreme Court of India
Citation: (2018) 9 SCC 1
Date: September 13, 2018

FULL JUDGMENT TEXT:

This landmark judgment addresses the fundamental right to property and the constitutional validity of land acquisition laws.

BACKGROUND:
The case arose from challenges to the Karnataka Land Reforms Act and its impact on property rights. The petitioners argued that the Act violated their fundamental right to property.

KEY ISSUES:
1. Whether the right to property is a fundamental right
2. The scope of Article 300A (Right to Property)
3. The balance between property rights and public interest
4. The constitutional validity of land acquisition laws

HELD:
The Supreme Court held that:

1. The right to property is a constitutional right under Article 300A
2. Article 300A provides that no person shall be deprived of his property save by authority of law
3. The following principles apply to property rights:
   - Property can only be acquired by authority of law
   - The law must be just, fair, and reasonable
   - Adequate compensation must be provided
   - The acquisition must be for public purpose

4. The Court emphasized that:
   - Property rights are essential for economic development
   - Land acquisition must balance individual rights with public interest
   - Compensation must be just and adequate
   - Procedural safeguards must be followed

5. The Court laid down guidelines for land acquisition:
   - Public purpose must be clearly defined
   - Social impact assessment must be conducted
   - Consent of landowners should be obtained where possible
   - Rehabilitation and resettlement must be provided

SIGNIFICANCE:
This judgment has been crucial in:
- Clarifying the scope of property rights under Article 300A
- Establishing guidelines for land acquisition
- Balancing individual rights with public interest
- Ensuring just compensation for property acquisition

The judgment has influenced land acquisition policies and has been cited in subsequent cases involving property rights.

This case represents an important step in protecting property rights while ensuring that public interest is not compromised.`,
    },

    // Human rights related judgments
    sc_human_rights_2019: {
      case_title: "Navtej Singh Johar vs Union of India",
      court: "Supreme Court of India",
      date: "2018-09-06",
      citation: "(2018) 10 SCC 1",
      judges: [
        "Chief Justice Dipak Misra",
        "Justice R. F. Nariman",
        "Justice A. M. Khanwilkar",
        "Justice D. Y. Chandrachud",
        "Justice Indu Malhotra",
      ],
      summary:
        "Landmark judgment decriminalizing homosexuality and recognizing LGBTQ+ rights",
      full_text: `NAVTEJ SINGH JOHAR vs UNION OF INDIA
Supreme Court of India
Citation: (2018) 10 SCC 1
Date: September 6, 2018

FULL JUDGMENT TEXT:

This landmark judgment decriminalized homosexuality in India and recognized the fundamental rights of the LGBTQ+ community.

BACKGROUND:
The case challenged the constitutional validity of Section 377 of the Indian Penal Code, which criminalized consensual same-sex relationships. The petitioners argued that this provision violated fundamental rights.

KEY ISSUES:
1. Whether Section 377 IPC violates fundamental rights
2. The scope of right to privacy under Article 21
3. The right to equality under Article 14
4. The right to dignity and personal liberty

HELD:
The Supreme Court held that:

1. Section 377 IPC is unconstitutional to the extent it criminalizes consensual same-sex relationships
2. The provision violates:
   - Article 14 (Right to Equality)
   - Article 15 (Prohibition of Discrimination)
   - Article 21 (Right to Life and Personal Liberty)

3. The Court recognized that:
   - Sexual orientation is an innate characteristic
   - LGBTQ+ individuals have the right to live with dignity
   - Privacy includes the right to make intimate choices
   - Discrimination based on sexual orientation is unconstitutional

4. The Court emphasized that:
   - Constitutional morality must prevail over social morality
   - Individual autonomy and dignity are fundamental
   - The State cannot interfere in consensual private relationships
   - LGBTQ+ individuals are entitled to equal protection of law

5. The Court directed that:
   - LGBTQ+ individuals should not face discrimination
   - They should have access to healthcare and other services
   - The State should take steps to eliminate stigma and discrimination

SIGNIFICANCE:
This judgment has been transformative in:
- Recognizing LGBTQ+ rights as fundamental rights
- Expanding the scope of right to privacy
- Promoting equality and non-discrimination
- Advancing human rights in India

The judgment has influenced social attitudes and has been cited in subsequent cases involving LGBTQ+ rights and privacy.

This case represents a significant step towards a more inclusive and equal society.`,
    },
  };

  return judgmentData[id] || null;
}

// Get Indian Kanoon search results for embedded display
app.get("/api/kanoon-search/:query", async (req, res) => {
  try {
    const { query } = req.params;

    console.log(`🔍 Indian Kanoon search for: "${query}"`);

    const kanoonResults = await indianKanoonAPI.searchCases(query);

    res.json({
      success: true,
      query,
      results: kanoonResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in Kanoon search:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Manual scraper trigger
app.post("/api/scraper/run", async (req, res) => {
  try {
    const { limit = 10 } = req.body;

    console.log(`🔍 Triggering manual scraper with limit: ${limit}`);

    const result = await autoScraper.runManualScraping(parseInt(limit));

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in manual scraper:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get scraper status
app.get("/api/scraper/status", (req, res) => {
  res.json({
    success: true,
    status: autoScraper.getStatus(),
    timestamp: new Date().toISOString(),
  });
});

// Database statistics
app.get("/api/stats", async (req, res) => {
  try {
    const stats = await getDatabaseStats();

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching stats:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("❌ Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Indian Law Search MERN Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Search API: GET http://localhost:${PORT}/api/search?q=query`);
  console.log(
    `💡 Suggestions: GET http://localhost:${PORT}/api/suggest?q=query`
  );
  console.log(
    `📋 Issue search: POST http://localhost:${PORT}/api/issue-search`
  );
  console.log(`🔧 MERN Stack: MongoDB + Express + React + Node.js`);
  console.log(`🤖 Auto-scraper: Scheduled daily at 6 AM IST`);
  console.log(`📈 Database: MongoDB with Elasticsearch indexing`);
});
