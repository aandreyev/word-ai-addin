# Mock API Responses for Testing Document Manipulation

## Response 1: Basic Modify + Insert (Current Default)
```json
[
  {
    "action": "modify",
    "sequentialNumber": 1,
    "instruction": "Break this opening paragraph into two shorter sentences for better readability and impact.",
    "newContent": "This is the opening paragraph that contains a very long sentence. It could potentially be improved by breaking it down into shorter, more digestible pieces for better readability and user engagement.",
    "reason": "Long opening sentences can lose reader attention immediately"
  },
  {
    "action": "insert",
    "afterSequentialNumber": 1,
    "instruction": "Add a transitional sentence that connects the introduction to the main points.",
    "newContent": "Let me explore how artificial intelligence can enhance document quality through intelligent editing suggestions.",
    "reason": "Improves document flow and helps readers follow the logical progression"
  }
]
```

## Response 2: Comprehensive Test (All Actions)
```json
[
  {
    "action": "modify",
    "sequentialNumber": 3,
    "instruction": "Remove redundancy and improve sentence structure.",
    "newContent": "This third paragraph has multiple issues: it contains redundant information and could benefit from better structure and flow to improve the overall document quality.",
    "reason": "Eliminates redundancy and improves clarity"
  },
  {
    "action": "insert",
    "afterSequentialNumber": 2,
    "instruction": "Add explanation after the short paragraph.",
    "newContent": "However, short paragraphs can be effective when used strategically to emphasize key points.",
    "reason": "Provides context and explanation for the brief statement"
  },
  {
    "action": "delete",
    "sequentialNumber": 4,
    "instruction": "Remove unnecessary transition paragraph.",
    "reason": "This transition is redundant and doesn't add value to the document flow"
  },
  {
    "action": "modify",
    "sequentialNumber": 6,
    "instruction": "Strengthen the conclusion with more specific language.",
    "newContent": "This final paragraph demonstrates successful testing of insertion points and modifications throughout the entire document structure, validating our comprehensive editing approach.",
    "reason": "More specific and conclusive language improves document ending"
  }
]
```

## Response 3: Edge Cases Test
```json
[
  {
    "action": "insert",
    "afterSequentialNumber": 6,
    "instruction": "Add a new conclusion paragraph at the very end.",
    "newContent": "In conclusion, this document has been successfully analyzed and improved through AI-powered editing suggestions that demonstrate the effectiveness of automated document enhancement.",
    "reason": "Provides proper conclusion to tie together all improvements"
  },
  {
    "action": "modify",
    "sequentialNumber": 5,
    "instruction": "Clarify the spacing and detection functionality.",
    "newContent": "This paragraph follows intentional empty lines and effectively tests how our system accurately handles spacing, paragraph detection, and content mapping.",
    "reason": "More precise description of the testing functionality"
  },
  {
    "action": "insert", 
    "afterSequentialNumber": 5,
    "instruction": "Add technical details about the testing process.",
    "newContent": "Our mapping system correctly identifies non-empty paragraphs while filtering out whitespace-only content, ensuring accurate sequential numbering.",
    "reason": "Provides technical insight into the document processing methodology"
  }
]
```

## Response 4: Error Testing (Invalid References)
```json
[
  {
    "action": "modify",
    "sequentialNumber": 99,
    "instruction": "This should fail validation - sequential number too high.",
    "newContent": "This should not be applied.",
    "reason": "Testing validation boundaries"
  },
  {
    "action": "insert",
    "afterSequentialNumber": 0,
    "instruction": "This should fail validation - sequential number too low.",
    "newContent": "This should not be applied.",
    "reason": "Testing validation boundaries"
  },
  {
    "action": "modify",
    "sequentialNumber": 2,
    "instruction": "This is valid and should work.",
    "newContent": "The second paragraph has been successfully modified during validation testing.",
    "reason": "Valid modification to confirm system still works with valid data"
  }
]
```

## Response 5: Delete Operation Focus Test
```json
[
  {
    "action": "delete",
    "sequentialNumber": 2,
    "instruction": "Remove this short paragraph as it doesn't add value.",
    "reason": "This paragraph is too brief and doesn't contribute meaningful content"
  },
  {
    "action": "modify",
    "sequentialNumber": 3,
    "instruction": "Improve this paragraph with better structure after the deletion.",
    "newContent": "This third paragraph (which will become the second after deletion) has been improved with better structure and flow to demonstrate that modifications work correctly after deletions.",
    "reason": "Shows that mapping remains valid even after paragraph deletion"
  },
  {
    "action": "delete",
    "sequentialNumber": 5,
    "instruction": "Remove this paragraph to test multiple deletions.",
    "reason": "Testing multiple delete operations to ensure clean removal"
  }
]
```

## Response 6: Edge Case - Delete First and Last Paragraphs  
```json
[
  {
    "action": "delete",
    "sequentialNumber": 1,
    "instruction": "Remove the first paragraph.",
    "reason": "Testing deletion of the first paragraph"
  },
  {
    "action": "delete",
    "sequentialNumber": 6,
    "instruction": "Remove the last paragraph.",
    "reason": "Testing deletion of the last paragraph"
  },
  {
    "action": "modify",
    "sequentialNumber": 3,
    "instruction": "Modify middle paragraph after first/last deletions.",
    "newContent": "This middle paragraph remains and has been modified to confirm the document structure is still intact after deleting the first and last paragraphs.",
    "reason": "Validates document integrity after edge case deletions"
  }
]
```
