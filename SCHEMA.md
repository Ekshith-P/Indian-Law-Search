# Indian Law Search - Unified Schema Design

## Overview

This document defines the unified schema for storing Indian legal documents including judgments, cases, laws, and articles in MongoDB and Elasticsearch.

## MongoDB Collections

### 1. Judgments Collection

```javascript
{
  "_id": ObjectId,
  "id": "sc_arnesh_kumar_2014",                    // Unique identifier
  "case_title": "Arnesh Kumar vs State of Bihar & Anr",
  "court": "Supreme Court of India",               // Court name
  "judges": ["Justice A", "Justice B"],            // Array of judge names
  "date": "2014-07-02",                           // Judgment date (ISO format)
  "citation": "(2014) 8 SCC 273",                 // Legal citation
  "pdf_url": "http://...",                        // Original PDF URL
  "text": "... full judgment text ...",           // Full judgment text
  "summary": "Arrest guidelines under Section 498A IPC ...", // Brief summary
  "referenced_sections": ["IPC 498A", "CrPC 41"], // Referenced legal sections
  "source_url": "https://...",                    // Source website URL
  "tags": ["criminal law", "arrest", "498A"],     // Search tags
  "created_at": "2024-01-01T00:00:00Z",          // Record creation timestamp
  "updated_at": "2024-01-01T00:00:00Z"           // Last update timestamp
}
```

### 2. Cases Collection

```javascript
{
  "_id": ObjectId,
  "id": "case_kesavananda_1973",                  // Unique identifier
  "case_title": "Kesavananda Bharati vs State of Kerala",
  "case_number": "Writ Petition (Civil) 135 of 1970",
  "court": "Supreme Court of India",
  "petitioner": "Kesavananda Bharati",
  "respondent": "State of Kerala",
  "date": "1973-04-24",
  "citation": "(1973) 4 SCC 225",
  "summary": "Basic structure doctrine case...",
  "judgment_text": "... full case text ...",
  "key_holdings": ["Basic structure doctrine", "Constitutional amendment limits"],
  "referenced_articles": ["Article 13", "Article 368"],
  "tags": ["constitutional law", "basic structure", "amendment"],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### 3. Laws Collection

```javascript
{
  "_id": ObjectId,
  "id": "law_ipc_1860",                           // Unique identifier
  "act_name": "Indian Penal Code, 1860",
  "act_number": "45 of 1860",
  "enactment_date": "1860-10-06",
  "commencement_date": "1862-01-01",
  "sections": [
    {
      "section_number": "498A",
      "title": "Cruelty by husband or relatives of husband",
      "content": "Whoever, being the husband or the relative of the husband...",
      "punishment": "Imprisonment for a term which may extend to three years and shall also be liable to fine"
    }
  ],
  "pdf_url": "http://...",
  "source_url": "https://...",
  "tags": ["criminal law", "penal code"],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### 4. Articles Collection

```javascript
{
  "_id": ObjectId,
  "id": "article_constitutional_analysis_2024",   // Unique identifier
  "title": "Analysis of Constitutional Amendments in India",
  "author": "Dr. Legal Expert",
  "publication": "Indian Law Review",
  "date": "2024-01-15",
  "content": "... full article content ...",
  "summary": "Comprehensive analysis of constitutional amendments...",
  "keywords": ["constitutional law", "amendments", "basic structure"],
  "source_url": "https://...",
  "tags": ["constitutional law", "analysis"],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

## Elasticsearch Indices

### 1. judgments Index

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "case_title": {
        "type": "text",
        "analyzer": "english",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "court": { "type": "keyword" },
      "judges": { "type": "keyword" },
      "date": { "type": "date" },
      "citation": { "type": "keyword" },
      "text": {
        "type": "text",
        "analyzer": "english"
      },
      "summary": {
        "type": "text",
        "analyzer": "english"
      },
      "referenced_sections": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "created_at": { "type": "date" }
    }
  }
}
```

### 2. cases Index

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "case_title": {
        "type": "text",
        "analyzer": "english"
      },
      "case_number": { "type": "keyword" },
      "court": { "type": "keyword" },
      "petitioner": { "type": "text" },
      "respondent": { "type": "text" },
      "date": { "type": "date" },
      "citation": { "type": "keyword" },
      "summary": {
        "type": "text",
        "analyzer": "english"
      },
      "judgment_text": {
        "type": "text",
        "analyzer": "english"
      },
      "key_holdings": { "type": "keyword" },
      "referenced_articles": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "created_at": { "type": "date" }
    }
  }
}
```

### 3. laws Index

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "act_name": {
        "type": "text",
        "analyzer": "english"
      },
      "act_number": { "type": "keyword" },
      "enactment_date": { "type": "date" },
      "commencement_date": { "type": "date" },
      "sections": {
        "type": "nested",
        "properties": {
          "section_number": { "type": "keyword" },
          "title": {
            "type": "text",
            "analyzer": "english"
          },
          "content": {
            "type": "text",
            "analyzer": "english"
          },
          "punishment": { "type": "text" }
        }
      },
      "tags": { "type": "keyword" },
      "created_at": { "type": "date" }
    }
  }
}
```

### 4. articles Index

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "title": {
        "type": "text",
        "analyzer": "english"
      },
      "author": { "type": "text" },
      "publication": { "type": "keyword" },
      "date": { "type": "date" },
      "content": {
        "type": "text",
        "analyzer": "english"
      },
      "summary": {
        "type": "text",
        "analyzer": "english"
      },
      "keywords": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "created_at": { "type": "date" }
    }
  }
}
```

## Search Queries

### 1. Full-Text Search

```json
{
  "query": {
    "multi_match": {
      "query": "498A IPC arrest guidelines",
      "fields": ["case_title^3", "summary^2", "text", "tags"],
      "type": "best_fields",
      "fuzziness": "AUTO"
    }
  }
}
```

### 2. Filtered Search

```json
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "constitutional amendment",
            "fields": ["case_title", "summary", "text"]
          }
        }
      ],
      "filter": [
        { "term": { "court": "Supreme Court of India" } },
        { "range": { "date": { "gte": "1970-01-01" } } }
      ]
    }
  }
}
```

### 3. Aggregation Search

```json
{
  "query": {
    "match": { "text": "fundamental rights" }
  },
  "aggs": {
    "courts": {
      "terms": { "field": "court" }
    },
    "years": {
      "date_histogram": {
        "field": "date",
        "calendar_interval": "year"
      }
    },
    "tags": {
      "terms": { "field": "tags" }
    }
  }
}
```

## Indexing Strategy

1. **Real-time Indexing**: New documents are indexed immediately after scraping
2. **Batch Updates**: Periodic re-indexing for updated documents
3. **Data Synchronization**: MongoDB as source of truth, Elasticsearch for search
4. **Backup Strategy**: Regular backups of both MongoDB and Elasticsearch data

## Performance Considerations

1. **Index Optimization**: Use appropriate analyzers and field mappings
2. **Sharding**: Distribute indices across multiple shards for large datasets
3. **Caching**: Implement Redis caching for frequently accessed data
4. **Pagination**: Use search_after for deep pagination
5. **Highlighting**: Configure highlighting for search result snippets
