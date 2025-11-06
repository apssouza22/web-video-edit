# DOM Testing Guide for Jest

A guide to working with HTML elements in Jest tests using jsdom.

## Table of Contents
- [Setting Up the DOM](#setting-up-the-dom)
- [Querying Elements](#querying-elements)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Setting Up the DOM

### In beforeEach Hook

Always set up your DOM structure in `beforeEach` and clean it up in `afterEach`:

```typescript
beforeEach(() => {
  document.body.innerHTML = `
    <div id="container">
      <button id="my-button">Click Me</button>
      <input id="my-input" type="text" />
    </div>
  `;
});

afterEach(() => {
  document.body.innerHTML = '';
});
```

### Why Clean Up?

Cleaning up prevents test pollution where DOM elements from one test affect another.

---

## Querying Elements

### Standard Query Methods

Jest uses jsdom which provides all standard DOM APIs:

```typescript
// By ID
const element = document.getElementById('my-button');

// By selector (returns first match)
const element = document.querySelector('.my-class');
const element = document.querySelector('#my-id');
const element = document.querySelector('button[type="submit"]');

// By selector (returns all matches)
const elements = document.querySelectorAll('.my-class');

// By class name
const elements = document.getElementsByClassName('my-class');

// By tag name
const elements = document.getElementsByTagName('button');
```

### Type Casting

When you know the element type, cast it:

```typescript
const button = document.getElementById('my-button') as HTMLButtonElement;
const input = document.querySelector('.my-input') as HTMLInputElement;
const link = document.querySelector('a') as HTMLAnchorElement;
```

### Checking Element Existence

**Wrong way:**
```typescript
const element = document.querySelector('.my-element');
expect(element).toBeDefined(); // ❌ Always passes! (null is defined)
```

**Right way:**
```typescript
const element = document.querySelector('.my-element');
expect(element).not.toBeNull(); // ✅ Correct
// or
expect(element).toBeTruthy(); // ✅ Also correct
```

---

## Common Patterns

### 1. Testing Element Properties

```typescript
test('should set correct attributes', () => {
  const link = document.querySelector('a') as HTMLAnchorElement;
  
  expect(link).not.toBeNull();
  expect(link.href).toBe('https://example.com');
  expect(link.textContent).toBe('Click here');
  expect(link.download).toBe('file.pdf');
});
```

### 2. Testing Element Contents

```typescript
test('should contain expected text', () => {
  const div = document.querySelector('.message');
  
  expect(div?.textContent).toBe('Hello World');
  expect(div?.innerHTML).toContain('<strong>Hello</strong>');
});
```

### 3. Testing CSS Classes

```typescript
test('should have correct classes', () => {
  const element = document.querySelector('.my-element');
  
  expect(element?.classList.contains('active')).toBe(true);
  expect(element?.className).toContain('active');
});
```

### 4. Testing Nested Elements

```typescript
test('should find nested elements', () => {
  // Query within a parent
  const parent = document.querySelector('.parent');
  const child = parent?.querySelector('.child');
  
  expect(child).not.toBeNull();
  
  // Or use descendant selector
  const child2 = document.querySelector('.parent .child');
  expect(child2).not.toBeNull();
});
```

### 5. Testing Input Values

```typescript
test('should update input value', () => {
  const input = document.querySelector('input') as HTMLInputElement;
  
  input.value = 'new value';
  expect(input.value).toBe('new value');
});
```

### 6. Testing Dynamic Elements

When elements are created dynamically (like popups):

```typescript
test('should create popup with link', () => {
  // Function that creates elements
  createPopup();
  
  // Query after creation
  const popup = document.querySelector('.popup');
  expect(popup).not.toBeNull();
  
  // Query nested elements
  const link = document.querySelector('.popup a') as HTMLAnchorElement;
  expect(link).not.toBeNull();
  expect(link.textContent).toBe('Download');
});
```

### 7. Testing Element Counts

```typescript
test('should create multiple items', () => {
  const items = document.querySelectorAll('.item');
  
  expect(items.length).toBe(5);
  expect(items).toHaveLength(5); // Alternative
});
```

---

## Troubleshooting

### Element is null/undefined

**Problem:**
```typescript
const element = document.querySelector('.my-element');
expect(element.textContent).toBe('Hello'); // ❌ Error: Cannot read property 'textContent' of null
```

**Solution 1:** Check if element exists first
```typescript
const element = document.querySelector('.my-element');
expect(element).not.toBeNull();
expect(element!.textContent).toBe('Hello');
```

**Solution 2:** Use optional chaining
```typescript
const element = document.querySelector('.my-element');
expect(element?.textContent).toBe('Hello');
```

### Wrong Selector

**Problem:**
```typescript
const link = document.querySelector('.popup'); // ❌ Selects div, not link
expect(link.download).toBe('file.json'); // undefined
```

**Solution:** Use correct selector
```typescript
const link = document.querySelector('.popup a'); // ✅ Selects anchor inside popup
expect(link.download).toBe('file.json');
```

### Element Not in DOM Yet

**Problem:**
```typescript
someFunction(); // Creates element asynchronously
const element = document.querySelector('.new-element'); // ❌ Not in DOM yet
```

**Solution:** Wait for async operations
```typescript
await someAsyncFunction();
const element = document.querySelector('.new-element'); // ✅ Now it exists
```

### Testing Component-Created Elements

When testing components that create their own DOM:

```typescript
test('should create component DOM', () => {
  const component = new MyComponent();
  component.render();
  
  // Query after render
  const element = document.querySelector('.component');
  expect(element).not.toBeNull();
});
```

---

## Best Practices

### ✅ DO

1. **Clean up after each test**
   ```typescript
   afterEach(() => {
     document.body.innerHTML = '';
   });
   ```

2. **Use specific selectors**
   ```typescript
   document.querySelector('#specific-id')
   document.querySelector('[data-testid="my-element"]')
   ```

3. **Check for null before accessing properties**
   ```typescript
   const element = document.querySelector('.my-element');
   expect(element).not.toBeNull();
   expect(element!.textContent).toBe('Hello');
   ```

4. **Use type casting when you know the type**
   ```typescript
   const input = document.querySelector('input') as HTMLInputElement;
   expect(input.value).toBe('test');
   ```

5. **Test behavior, not implementation details**
   ```typescript
   // ✅ Good: Test what user sees
   expect(button.textContent).toBe('Submit');
   
   // ❌ Bad: Test internal structure
   expect(button.innerHTML).toBe('<span>Submit</span>');
   ```

### ❌ DON'T

1. **Don't use toBeDefined() for null checks**
   ```typescript
   expect(element).toBeDefined(); // ❌ null is defined!
   expect(element).not.toBeNull(); // ✅ Correct
   ```

2. **Don't query elements before they exist**
   ```typescript
   // ❌ Wrong
   const element = document.querySelector('.popup');
   createPopup();
   
   // ✅ Right
   createPopup();
   const element = document.querySelector('.popup');
   ```

3. **Don't forget to clean up**
   ```typescript
   // ❌ Missing cleanup
   beforeEach(() => {
     document.body.innerHTML = '<div>test</div>';
   });
   
   // ✅ With cleanup
   afterEach(() => {
     document.body.innerHTML = '';
   });
   ```

4. **Don't rely on timing in synchronous tests**
   ```typescript
   // ❌ Wrong
   setTimeout(() => createElement(), 100);
   const element = document.querySelector('.element');
   
   // ✅ Right: Use async/await
   await new Promise(resolve => setTimeout(resolve, 100));
   const element = document.querySelector('.element');
   ```

---

## Examples from Studio Tests

### Example 1: Testing Popup Creation

```typescript
test('should create popup with content', () => {
  const content = document.createElement('p');
  content.textContent = 'Test content';

  popup(content);

  const popupElement = document.querySelector('.popup');
  expect(popupElement).not.toBeNull();
  expect(popupElement?.textContent).toContain('Test content');
});
```

### Example 2: Testing Dropdown

```typescript
test('should create dropdown with items', () => {
  const parent = document.createElement('div');
  selector.mount(parent);

  const dropdown = parent.querySelector('#aspect-ratio-dropdown');
  expect(dropdown).not.toBeNull();

  const items = parent.querySelectorAll('.dropdown-item');
  expect(items.length).toBe(4);
});
```

### Example 3: Testing Dynamic Link

```typescript
test('should set download attribute', () => {
  exportToJson();

  const downloadLink = document.querySelector('.popup a') as HTMLAnchorElement;
  expect(downloadLink).not.toBeNull();
  expect(downloadLink.download).toMatch(/^\d+_\d+\.json$/);
});
```

---

## Summary

**Key Points:**
1. Set up DOM in `beforeEach`, clean up in `afterEach`
2. Use `.not.toBeNull()` to check element existence
3. Use specific selectors (`.popup a` not just `.popup`)
4. Type cast when you know the element type
5. Query elements **after** they're created
6. Use optional chaining (`?.`) for safer access

**Common Queries:**
- `document.getElementById('id')` - Single element by ID
- `document.querySelector('.class')` - First match
- `document.querySelectorAll('.class')` - All matches
- `parent.querySelector('.child')` - Query within parent

**Remember:** jsdom provides a full DOM implementation, so all standard browser APIs work in tests!

