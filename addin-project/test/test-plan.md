# Comprehensive Testing Plan for Mapping Approach

## Phase 1: Document Setup
1. **Copy test content** from `./test/test-document-content.md` into a Word document
2. **Load the add-in** and verify connection
3. **Analyze document** to verify mapping creation

### Expected Mapping Results:
- Total paragraphs: ~10 (including empty)
- Non-empty paragraphs: ~6
- Sequential numbering: 1, 2, 3, 4, 5, 6
- Empty paragraphs: Properly skipped

## Phase 2: Basic Functionality Testing
### Test 2.1: Default Mock Response (Current)
- **Action**: Click "Analyze Document"
- **Expected**: 2 suggestions (1 modify, 1 insert)
- **Verify**: Sequential numbers 1 and 1 (after)
- **Apply**: Click "Apply Suggestions"
- **Check**: Paragraph 1 modified, new paragraph inserted after

### Test 2.2: Switch to Comprehensive Mock Response
- **Action**: Update `getMockResponse()` to use Response 2
- **Expected**: 4 suggestions (2 modify, 1 insert, 1 delete)
- **Verify**: Sequential numbers 3, 2, 4, 6
- **Apply**: Test two-phase application order

## Phase 3: Advanced Testing
### Test 3.1: Edge Cases
- **Action**: Use Response 3 (insertion at end, multiple operations)
- **Expected**: Test boundary conditions
- **Verify**: Insert after last paragraph works

### Test 3.2: Validation Testing
- **Action**: Use Response 4 (invalid references)
- **Expected**: Invalid suggestions filtered out
- **Verify**: Only valid suggestion (sequential 2) is applied

## Phase 4: Sequential Number Resolution
### Test 4.1: Mapping Verification
- **Check console logs** for:
  - `🎯 Analyzing X non-empty paragraphs`
  - `Mapping Y: [Word Index Z]`
  - `Skipped N: [Empty paragraph]`

### Test 4.2: Resolution Verification
- **Check console logs** for:
  - `🔍 Resolved sequential X to Word index Y`
  - `✅ Valid {action} suggestion for sequential X`

## Phase 5: Document Manipulation Testing
### Test 5.1: Modify Actions
- **Verify**: Original paragraph content replaced entirely
- **Check**: Immutable references work correctly

### Test 5.2: Insert Actions  
- **Verify**: New content inserted at correct position
- **Check**: Sequential numbering resolution works

### Test 5.3: Delete Actions
- **Verify**: Correct paragraph removed
- **Check**: Reverse order processing works

## Phase 6: Error Handling
### Test 6.1: Empty Document
- **Setup**: Clear document content
- **Expected**: Error "Document has no content to analyze"

### Test 6.2: Invalid Mapping
- **Setup**: Document changes between analysis and application
- **Expected**: Graceful error handling

## Success Criteria:
✅ Empty paragraphs filtered correctly  
✅ Sequential numbering works (1-based)  
✅ Mapping resolution (sequential → Word index)  
✅ Two-phase application order maintained  
✅ All CRUD operations work (Create, Read, Update, Delete)  
✅ Error validation prevents invalid operations  
✅ Immutable references remain stable  
✅ Console logging provides clear debugging info  

## Files Created:
- `./test/test-document-content.md` - Source content for Word document
- `./test/test-mock-responses.md` - Various mock API responses
- `./test/test-plan.md` - This comprehensive testing plan
