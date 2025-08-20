const { MongoClient } = require("mongodb");

const MONGODB_URI =
  "mongodb://admin:password@localhost:27018/indian_law_db?authSource=admin";

const sampleLaws = [
  {
    id: "law_ipc_1860",
    act_name: "Indian Penal Code, 1860",
    act_number: "45 of 1860",
    enactment_date: "1860-10-06",
    commencement_date: "1862-01-01",
    sections: [
      {
        section_number: "498A",
        title: "Cruelty by husband or relatives of husband",
        content:
          "Whoever, being the husband or the relative of the husband of a woman, subjects such woman to cruelty shall be punished with imprisonment for a term which may extend to three years and shall also be liable to fine.",
        punishment:
          "Imprisonment for a term which may extend to three years and shall also be liable to fine",
      },
      {
        section_number: "302",
        title: "Punishment for murder",
        content:
          "Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.",
        punishment:
          "Death, or imprisonment for life, and shall also be liable to fine",
      },
      {
        section_number: "420",
        title: "Cheating and dishonestly inducing delivery of property",
        content:
          "Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, and which is capable of being converted into a valuable security, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine.",
        punishment:
          "Imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine",
      },
    ],
    pdf_url: "https://legislative.gov.in/act-45-1860",
    source_url: "https://legislative.gov.in/act-45-1860",
    tags: ["criminal law", "penal code", "offences", "punishment"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "law_crpc_1973",
    act_name: "Code of Criminal Procedure, 1973",
    act_number: "2 of 1974",
    enactment_date: "1974-01-25",
    commencement_date: "1974-04-01",
    sections: [
      {
        section_number: "41",
        title: "When police may arrest without warrant",
        content:
          "Any police officer may without an order from a Magistrate and without a warrant, arrest any person who has been concerned in any cognizable offence, or against whom a reasonable complaint has been made, or credible information has been received, or a reasonable suspicion exists, of his having been so concerned.",
        punishment: "Not applicable",
      },
      {
        section_number: "438",
        title: "Direction for grant of bail to person apprehending arrest",
        content:
          "When any person has reason to believe that he may be arrested on an accusation of having committed a non-bailable offence, he may apply to the High Court or the Court of Session for a direction under this section.",
        punishment: "Not applicable",
      },
    ],
    pdf_url: "https://legislative.gov.in/act-2-1974",
    source_url: "https://legislative.gov.in/act-2-1974",
    tags: ["criminal law", "procedure", "arrest", "bail", "investigation"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "law_constitution_1950",
    act_name: "Constitution of India, 1950",
    act_number: "Not applicable",
    enactment_date: "1950-01-26",
    commencement_date: "1950-01-26",
    sections: [
      {
        section_number: "Article 13",
        title:
          "Laws inconsistent with or in derogation of the fundamental rights",
        content:
          "All laws in force in the territory of India immediately before the commencement of this Constitution, in so far as they are inconsistent with the provisions of this Part, shall, to the extent of such inconsistency, be void.",
        punishment: "Not applicable",
      },
      {
        section_number: "Article 21",
        title: "Protection of life and personal liberty",
        content:
          "No person shall be deprived of his life or personal liberty except according to procedure established by law.",
        punishment: "Not applicable",
      },
      {
        section_number: "Article 368",
        title:
          "Power of Parliament to amend the Constitution and procedure therefor",
        content:
          "Notwithstanding anything in this Constitution, Parliament may in exercise of its constituent power amend by way of addition, variation or repeal any provision of this Constitution in accordance with the procedure laid down in this article.",
        punishment: "Not applicable",
      },
    ],
    pdf_url: "https://legislative.gov.in/constitution-of-india",
    source_url: "https://legislative.gov.in/constitution-of-india",
    tags: [
      "constitutional law",
      "fundamental rights",
      "amendment",
      "democracy",
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

async function addSampleLaws() {
  let client = null;

  try {
    console.log("📚 Adding sample laws to MongoDB...");

    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db("indian_law_db");

    // Check if laws collection exists, if not create it
    const collections = await db.listCollections().toArray();
    const lawCollectionExists = collections.some((col) => col.name === "laws");

    if (!lawCollectionExists) {
      await db.createCollection("laws");
      console.log("✅ Created laws collection");
    }

    const lawsCollection = db.collection("laws");

    // Clear existing sample laws
    await lawsCollection.deleteMany({
      id: { $in: sampleLaws.map((law) => law.id) },
    });
    console.log("🧹 Cleared existing sample laws");

    // Insert new sample laws
    const result = await lawsCollection.insertMany(sampleLaws);
    console.log(`✅ Inserted ${result.insertedCount} sample laws`);

    // Display inserted laws
    console.log("\n📋 Sample laws added:");
    sampleLaws.forEach((law) => {
      console.log(`  - ${law.act_name} (${law.id})`);
    });

    // Verify insertion
    const totalLaws = await lawsCollection.countDocuments();
    console.log(`\n📊 Total laws in collection: ${totalLaws}`);
  } catch (error) {
    console.error("❌ Error adding sample laws:", error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run the script
addSampleLaws();

