#!/usr/bin/env python3
"""
Extractive Summarization for Indian Legal Cases
Uses sumy library and regex-based heuristics to extract key sentences
"""

import re
import nltk
import argparse
import json
import sys
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lsa import LsaSummarizer
from sumy.summarizers.lex_rank import LexRankSummarizer
from sumy.summarizers.text_rank import TextRankSummarizer
from sumy.nlp.stemmers import Stemmer
from sumy.utils import get_stop_words
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LegalCaseSummarizer:
    def __init__(self, language='english'):
        self.language = language
        self.stemmer = Stemmer(language)
        self.stop_words = get_stop_words(language)
        
        # Download required NLTK data
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            nltk.download('punkt')
        
        # Legal keywords that indicate important sentences
        self.legal_keywords = [
            'held', 'directed', 'guidelines', 'ordered', 'ruled', 'decided',
            'concluded', 'determined', 'found', 'established', 'declared',
            'maintained', 'observed', 'noted', 'emphasized', 'highlighted',
            'clarified', 'interpreted', 'construed', 'applied', 'followed',
            'overruled', 'distinguished', 'approved', 'disapproved', 'rejected',
            'allowed', 'dismissed', 'quashed', 'set aside', 'remanded',
            'affirmed', 'reversed', 'modified', 'varied', 'substituted'
        ]
        
        # Court-specific keywords
        self.court_keywords = [
            'supreme court', 'high court', 'district court', 'tribunal',
            'commission', 'authority', 'board', 'council'
        ]
        
        # Legal section keywords
        self.section_keywords = [
            'section', 'article', 'clause', 'sub-section', 'proviso',
            'schedule', 'act', 'code', 'regulation', 'rule'
        ]

    def extract_key_sentences_regex(self, text, max_sentences=4):
        """
        Extract key sentences using regex-based heuristics
        """
        if not text or len(text.strip()) < 100:
            return []
        
        # Split into sentences (basic approach)
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
        
        # Score sentences based on legal keywords
        scored_sentences = []
        for sentence in sentences:
            score = 0
            
            # Check for legal keywords
            sentence_lower = sentence.lower()
            for keyword in self.legal_keywords:
                if keyword in sentence_lower:
                    score += 3
            
            # Check for court keywords
            for keyword in self.court_keywords:
                if keyword in sentence_lower:
                    score += 2
            
            # Check for section references
            for keyword in self.section_keywords:
                if keyword in sentence_lower:
                    score += 2
            
            # Check for citations (e.g., (2023) 1 SCC 123)
            if re.search(r'\(\d{4}\)\s+\d+\s+[A-Z]+\s+\d+', sentence):
                score += 3
            
            # Check for case names (e.g., "vs", "versus")
            if re.search(r'\b(vs|versus|v\.)\b', sentence, re.IGNORECASE):
                score += 2
            
            # Check for judge names
            if re.search(r'Justice\s+[A-Z]', sentence):
                score += 2
            
            # Check for dates
            if re.search(r'\d{1,2}[-/]\d{1,2}[-/]\d{4}', sentence):
                score += 1
            
            # Bonus for longer sentences (more detailed)
            if len(sentence) > 100:
                score += 1
            
            scored_sentences.append((sentence, score))
        
        # Sort by score and return top sentences
        scored_sentences.sort(key=lambda x: x[1], reverse=True)
        top_sentences = [s[0] for s in scored_sentences[:max_sentences]]
        
        return top_sentences

    def extract_summary_sumy(self, text, max_sentences=4, method='lsa'):
        """
        Extract summary using sumy library
        """
        try:
            if not text or len(text.strip()) < 200:
                return []
            
            # Parse text
            parser = PlaintextParser.from_string(text, Tokenizer(self.language))
            
            # Choose summarizer
            if method == 'lsa':
                summarizer = LsaSummarizer(self.stemmer)
            elif method == 'lexrank':
                summarizer = LexRankSummarizer(self.stemmer)
            elif method == 'textrank':
                summarizer = TextRankSummarizer(self.stemmer)
            else:
                summarizer = LsaSummarizer(self.stemmer)
            
            # Set stop words
            summarizer.stop_words = self.stop_words
            
            # Generate summary
            summary = summarizer(parser.document, max_sentences)
            summary_sentences = [str(sentence) for sentence in summary]
            
            return summary_sentences
            
        except Exception as e:
            logger.error(f"Error in sumy summarization: {e}")
            return []

    def extract_hybrid_summary(self, text, max_sentences=4):
        """
        Combine regex and sumy approaches for better results
        """
        try:
            # Get regex-based sentences
            regex_sentences = self.extract_key_sentences_regex(text, max_sentences)
            
            # Get sumy-based sentences
            sumy_sentences = self.extract_summary_sumy(text, max_sentences, 'lsa')
            
            # Combine and deduplicate
            all_sentences = []
            
            # Add regex sentences first (they're more targeted)
            for sentence in regex_sentences:
                if sentence not in all_sentences and len(all_sentences) < max_sentences:
                    all_sentences.append(sentence)
            
            # Add sumy sentences if we need more
            for sentence in sumy_sentences:
                if sentence not in all_sentences and len(all_sentences) < max_sentences:
                    all_sentences.append(sentence)
            
            # If we still don't have enough, add some basic sentences
            if len(all_sentences) < max_sentences:
                sentences = re.split(r'[.!?]+', text)
                sentences = [s.strip() for s in sentences if len(s.strip()) > 50]
                
                for sentence in sentences:
                    if sentence not in all_sentences and len(all_sentences) < max_sentences:
                        all_sentences.append(sentence)
            
            return all_sentences
            
        except Exception as e:
            logger.error(f"Error in hybrid summarization: {e}")
            return []

    def extract_case_summary(self, case_text, case_title=None, max_sentences=4):
        """
        Main method to extract case summary
        """
        try:
            if not case_text:
                return ""
            
            # Try hybrid approach first
            summary_sentences = self.extract_hybrid_summary(case_text, max_sentences)
            
            if not summary_sentences:
                # Fallback to regex only
                summary_sentences = self.extract_key_sentences_regex(case_text, max_sentences)
            
            if not summary_sentences:
                # Last resort: take first few sentences
                sentences = re.split(r'[.!?]+', case_text)
                sentences = [s.strip() for s in sentences if len(s.strip()) > 30]
                summary_sentences = sentences[:max_sentences]
            
            # Clean and format summary
            summary = ". ".join(summary_sentences)
            if not summary.endswith('.'):
                summary += '.'
            
            # Add case title if provided
            if case_title:
                summary = f"{case_title}: {summary}"
            
            return summary
            
        except Exception as e:
            logger.error(f"Error extracting case summary: {e}")
            return "Summary extraction failed."

def main():
    """
    Main function with command line argument support
    """
    parser = argparse.ArgumentParser(description='Legal Case Summarizer')
    parser.add_argument('--text', '-t', required=True, help='Text to summarize')
    parser.add_argument('--title', '-n', default='', help='Case title')
    parser.add_argument('--method', '-m', default='hybrid', 
                       choices=['hybrid', 'regex', 'lsa', 'lexrank', 'textrank'],
                       help='Summarization method')
    parser.add_argument('--max_sentences', '-s', type=int, default=4,
                       help='Maximum number of sentences in summary')
    parser.add_argument('--output', '-o', default='json',
                       choices=['json', 'text'], help='Output format')
    
    args = parser.parse_args()
    
    try:
        # Initialize summarizer
        summarizer = LegalCaseSummarizer()
        
        # Extract summary
        if args.method == 'regex':
            summary_sentences = summarizer.extract_key_sentences_regex(
                args.text, args.max_sentences
            )
            summary = ". ".join(summary_sentences)
            if not summary.endswith('.'):
                summary += '.'
        elif args.method in ['lsa', 'lexrank', 'textrank']:
            summary_sentences = summarizer.extract_summary_sumy(
                args.text, args.max_sentences, args.method
            )
            summary = ". ".join(summary_sentences)
            if not summary.endswith('.'):
                summary += '.'
        else:  # hybrid
            summary = summarizer.extract_case_summary(
                args.text, args.title, args.max_sentences
            )
        
        # Output result
        if args.output == 'json':
            result = {
                'status': 'success',
                'summary': summary,
                'method': args.method,
                'max_sentences': args.max_sentences,
                'original_length': len(args.text),
                'summary_length': len(summary),
                'compression_ratio': f"{(len(summary) / len(args.text) * 100):.2f}%"
            }
            print(json.dumps(result, indent=2))
        else:
            print(summary)
            
    except Exception as e:
        error_result = {
            'status': 'error',
            'error': str(e),
            'method': args.method,
            'max_sentences': args.max_sentences
        }
        print(json.dumps(error_result, indent=2), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
