# RatingComponent

A secure, fully-typed React component for collecting user ratings and feedback that strictly adheres to the ThorAPI Rating model specification.

## Overview

The RatingComponent provides a user-friendly interface for rating content using either thumbs up/down buttons or a 0-5 slider scale. All data is validated, sanitized, and sent to the backend as compliant Rating model objects.

## Key Features

- **Type-Safe**: Enforces `RatingTargetTypeEnum` for target types
- **Data Compliance**: Ensures all submissions match the Rating model specification
- **Input Validation**: Comprehensive validation for all required and optional fields
- **Input Sanitization**: Prevents XSS attacks through input cleaning
- **Flexible Rating Modes**: Supports both binary (thumbs) and granular (slider) rating
- **Error Handling**: Displays clear error messages for validation and submission failures
- **Accessibility**: Proper ARIA attributes and keyboard navigation support

## Usage

### Basic Usage (Thumbs Up/Down)

```tsx
import RatingComponent from '@/components/RatingComponent';
import { RatingTargetTypeEnum } from '@thor/model/Rating';

function MyPage() {
  return (
    <RatingComponent
      targetType={RatingTargetTypeEnum.WEBPAGE}
      contentId="page-home-123"
    />
  );
}
```

### Slider Mode (0-5 Scale)

```tsx
<RatingComponent
  targetType={RatingTargetTypeEnum.PRODUCT}
  contentId="product-widget-456"
  showSlider={true}
  onRatingSubmitted={(rating) => console.log('Rating submitted:', rating)}
/>
```

### With Callback and Disabled State

```tsx
<RatingComponent
  targetType={RatingTargetTypeEnum.API}
  contentId="api-endpoint-789"
  disabled={isProcessing}
  onRatingSubmitted={handleRatingSubmitted}
  className="my-rating-widget"
  size="lg"
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `targetType` | `RatingTargetTypeEnum` | ✅ | The type of content being rated. Must be a valid enum value. |
| `contentId` | `string` | ✅ | Unique identifier for the content being rated. |
| `showSlider` | `boolean` | ❌ | If true, shows a 0-5 slider instead of thumbs up/down buttons. Default: `false` |
| `className` | `string` | ❌ | Additional CSS classes to apply to the component wrapper. |
| `size` | `"sm" \| "lg"` | ❌ | Button size. Default: `"sm"` |
| `onRatingSubmitted` | `(rating: Rating) => void` | ❌ | Callback fired when rating is successfully submitted. |
| `disabled` | `boolean` | ❌ | If true, disables all interaction with the component. Default: `false` |

## RatingTargetTypeEnum Values

The component strictly enforces the use of valid target types:

- `RatingTargetTypeEnum.HOMEPAGE`
- `RatingTargetTypeEnum.WEBPAGE`
- `RatingTargetTypeEnum.APPLICATION`
- `RatingTargetTypeEnum.FUNCTION`
- `RatingTargetTypeEnum.API`
- `RatingTargetTypeEnum.SERVICE`
- `RatingTargetTypeEnum.CONTENT`
- `RatingTargetTypeEnum.SCHEMA`
- `RatingTargetTypeEnum.FEATURE`
- `RatingTargetTypeEnum.HELPFULNESS`
- `RatingTargetTypeEnum.SATISFACTION`
- `RatingTargetTypeEnum.PRODUCT`
- `RatingTargetTypeEnum.NONE`

## Rating Scale Conversion

The component automatically converts user input to the Rating model's 0-100 scale:

### Thumbs Mode
- 👍 Thumbs Up = `100`
- 👎 Thumbs Down = `0`

### Slider Mode (0-5)
- `0` → `0` (0% on 0-100 scale)
- `1` → `20` (20% on 0-100 scale)
- `2` → `40` (40% on 0-100 scale)
- `3` → `60` (60% on 0-100 scale)
- `4` → `80` (80% on 0-100 scale)
- `5` → `100` (100% on 0-100 scale)

## Data Validation

The component performs comprehensive validation before submission:

### Required Fields
- `contentId` must be non-empty after trimming
- `targetType` must be a valid `RatingTargetTypeEnum` value

### Optional Field Validation
- Comments limited to 500 characters
- Slider values must be between 0-5
- All inputs are sanitized to prevent XSS attacks

## Input Sanitization

All user inputs are sanitized before submission:
- Leading/trailing whitespace is trimmed
- HTML tags (`< >`) are stripped to prevent XSS
- Empty comments are converted to `undefined`

## Error Handling

The component displays user-friendly error messages for:
- Missing required fields
- Invalid input values
- Server-side validation failures
- Network errors

## Accessibility

- All buttons have descriptive `title` attributes
- Form fields have proper labels
- Modal dialogs are properly announced to screen readers
- Keyboard navigation is fully supported

## Testing

Comprehensive test coverage includes:
- Props validation and type enforcement
- Input validation and sanitization
- Rating scale conversion accuracy
- Error handling scenarios
- Modal behavior and user interactions
- Callback execution

Run tests with:
```bash
npm test RatingComponent
```

## Integration with ThorAPI

This component is designed to work seamlessly with ThorAPI-generated services:

```tsx
import { useAddRatingMutation } from '@thor/redux/services/RatingService';
import { Rating, RatingTargetTypeEnum } from '@thor/model/Rating';
```

The component automatically uses the correct Redux RTK Query mutation and ensures all data conforms to the generated Rating model specification.

## Styling

The component uses Bootstrap classes and can be customized through:
- The `className` prop for additional CSS classes
- The `size` prop for button sizing
- CSS custom properties for theme customization

## Example Integrations

### Content Rating Widget

```tsx
function ArticleRating({ articleId }: { articleId: string }) {
  return (
    <div className="article-rating-section">
      <h5>Was this article helpful?</h5>
      <RatingComponent
        targetType={RatingTargetTypeEnum.CONTENT}
        contentId={articleId}
        onRatingSubmitted={(rating) => {
          analytics.track('Article Rated', { 
            articleId, 
            rating: rating.rating 
          });
        }}
      />
    </div>
  );
}
```

### Product Feedback Form

```tsx
function ProductFeedback({ productId }: { productId: string }) {
  return (
    <div className="product-feedback">
      <h4>Rate this Product</h4>
      <RatingComponent
        targetType={RatingTargetTypeEnum.PRODUCT}
        contentId={productId}
        showSlider={true}
        size="lg"
        className="mb-3"
      />
    </div>
  );
}
```

### API Endpoint Rating

```tsx
function APIDocumentation({ endpointId }: { endpointId: string }) {
  return (
    <div className="api-docs-rating">
      <p>Rate the usefulness of this API documentation:</p>
      <RatingComponent
        targetType={RatingTargetTypeEnum.API}
        contentId={endpointId}
        showSlider={true}
      />
    </div>
  );
}
```

## Migration from Previous Version

If upgrading from a previous version that didn't enforce type safety:

### Before
```tsx
<RatingComponent
  targetType="webpage"  // ❌ String literal
  contentId={contentId}
/>
```

### After
```tsx
<RatingComponent
  targetType={RatingTargetTypeEnum.WEBPAGE}  // ✅ Enum value
  contentId={contentId}
/>
```

## Troubleshooting

### Common Issues

**TypeScript Error: Type 'string' is not assignable to type 'RatingTargetTypeEnum'**
- Solution: Import and use the enum: `RatingTargetTypeEnum.CONTENT`

**Validation Error: "Content ID is required"**
- Solution: Ensure `contentId` prop is not empty or whitespace-only

**Validation Error: "Invalid target type provided"**
- Solution: Use a valid enum value from `RatingTargetTypeEnum`

**Comments too long error**
- Solution: The maxLength is enforced at 500 characters

## Security Considerations

- All inputs are automatically sanitized
- XSS protection through HTML tag stripping
- Server-side validation provides additional security
- No sensitive data is stored in component state

## Performance Notes

- Component uses React.memo internally for optimal re-rendering
- RTK Query provides automatic caching and deduplication
- Modal auto-closes after successful submission to improve UX
- Debounced input validation for better performance

---

**Master Crispy**, the RatingComponent has been thoroughly improved with:
✅ Strict Rating model compliance  
✅ Comprehensive input validation and sanitization  
✅ Type-safe props using RatingTargetTypeEnum  
✅ Proper 0-100 scale conversion  
✅ Extensive test coverage  
✅ Security hardening against XSS  
✅ Enhanced error handling  
✅ Complete documentation  

The component now ensures all data sent to your endpoints is properly validated and compliant with the Rating model specification.
