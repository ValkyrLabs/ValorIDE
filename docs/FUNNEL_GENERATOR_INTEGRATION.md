# ValorIDE Integration: Digital Product Funnel Generator

**Quick Start Guide for AI Coding Agents**

---

## 🎯 What This Does

When a user asks to **"generate a digital product funnel"** or **"create a landing page for my offer"**, this system:

1. ✅ Generates a complete PRD (Product Requirements Document)
2. ✅ Creates landing page sections (hero, features, testimonials, CTA)
3. ✅ Writes ad copy variants (TikTok, Instagram, LinkedIn)
4. ✅ Builds email nurture sequence (3-5 emails)
5. ✅ Outputs structured JSON for CMS integration

---

## 📋 User Prompts to Recognize

**Direct requests:**

- "Generate a funnel for my [product]"
- "Create a landing page for [offer]"
- "Build a course launch funnel"
- "Generate ad copy for my [product]"

**Contextual requests:**

- "I need to launch [product], help me create marketing materials"
- "How do I sell [offer] to [audience]?"
- "Create a PRD for [digital product]"

---

## 🚀 How to Invoke (3 Methods)

### Method 1: Direct Command (Fastest)

```typescript
// In ValorIDE command handler
const response = await executeCommand("/generate digital_product", {
  brand: "Valkyr Labs",
  offer: "Reverse SaaS Launch System",
  target_audience: "founders + CTOs",
  price_tier: "$499",
  delivery_mode: "mentorship program",
  hero_benefit: "Ship your first AI workflow in 7 days",
});
```

### Method 2: Via ValkyrAI Workflow API

```bash
curl -X POST http://localhost:8080/api/v1/vaiworkflow/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "workflowName": "generate_product_funnel",
    "initialState": {
      "brand": "Valkyr Labs",
      "offer": "AI Blueprint",
      "targetAudience": "solopreneurs",
      "priceTier": "tripwire",
      "priceAmount": 49.0,
      "deliveryMode": "course",
      "heroBenefit": "Build your first AI app in 30 days"
    }
  }'
```

### Method 3: ValorIDE SWARM Coordination

```typescript
// Send command to ValkyrAI mothership
await swarmClient.sendCommand({
  targetAgent: "valkyrai-server",
  command: "GENERATE_FUNNEL",
  payload: {
    brand: "Valkyr Labs",
    offer: "Reverse SaaS Accelerator",
    targetAudience: "founders, devs",
    priceTier: "core",
    priceAmount: 499.0,
    deliveryMode: "mentorship",
    heroBenefit: "Ship your first AI workflow in 7 days",
  },
});
```

---

## 📝 Input Parameters (Required)

| Parameter         | Type   | Example                   | Notes                                                                         |
| ----------------- | ------ | ------------------------- | ----------------------------------------------------------------------------- |
| `brand`           | string | "Valkyr Labs"             | Brand name                                                                    |
| `offer`           | string | "AI Blueprint"            | Product/offer name                                                            |
| `target_audience` | string | "founders, devs"          | Primary audience                                                              |
| `price_tier`      | string | "core"                    | Options: free, tripwire, core, high_ticket                                    |
| `delivery_mode`   | string | "course"                  | Options: course, challenge, mentorship, consulting, saas, template, blueprint |
| `hero_benefit`    | string | "Build AI app in 30 days" | Main transformation promise                                                   |

**Optional:**

- `priceAmount`: number (e.g., 499.0)
- `templateId`: UUID (use FunnelTemplate)

---

## 📤 Expected Output

```json
{
  "status": "completed",
  "contentDataId": "uuid-...",
  "prd": {
    "productName": "AI Blueprint",
    "problem": "Most founders waste 100+ hours trying to...",
    "promise": "Ship your first AI workflow in 30 days...",
    "offerStructure": {
      "modules": [...],
      "bonuses": [...],
      "timeline": "30 days"
    },
    "funnelStages": [...]
  },
  "landingPageSections": [
    {
      "sectionType": "hero",
      "config": {
        "headline": "Build Your First AI App in 30 Days",
        "subheadline": "No coding required. No team needed.",
        "ctaText": "Get Started Now",
        "ctaUrl": "/checkout"
      }
    },
    ...
  ],
  "adVariants": [
    {
      "platform": "tiktok",
      "duration": 15,
      "hook": "This is why you can't build an app with AI...",
      "value": "Because AI writes code — but doesn't ship workflows.",
      "cta": "Click the link, I'll show you how ValkyrAI does both.",
      "hashtags": ["#ai", "#startup"],
      "visualNotes": "Dark mode, quick cuts, SF Pro font"
    },
    ...
  ],
  "emailSequence": [
    {
      "sequenceOrder": 1,
      "subject": "Welcome - Your AI Blueprint",
      "bodyHtml": "...",
      "sendDelay": 0
    },
    ...
  ]
}
```

---

## 🎯 User Experience Flow (ValorIDE)

```
User: "Help me create a funnel for my AI course"
  ↓
ValorIDE: Extracts parameters via conversation
  - "What's your brand name?" → "Valkyr Labs"
  - "What's the course called?" → "AI Masterclass"
  - "Who's it for?" → "developers, founders"
  - "What's the price?" → "$299"
  - "What's the main benefit?" → "Master AI workflows in 14 days"
  ↓
ValorIDE: Calls FunnelGeneratorModule
  ↓
ValkyrAI: Generates content via GPT-4o
  ↓
ValorIDE: Displays results
  - ✅ PRD created
  - ✅ Landing page sections ready
  - ✅ 3 ad variants generated
  - ✅ Email sequence created
  ↓
User: "Show me the landing page"
  ↓
ValorIDE: Renders preview or generates HTML
```

---

## 🧩 Integration with Existing ValorIDE Features

### 1. Command Palette Integration

```typescript
// valoride/src/commands/funnelGenerator.ts
export const registerFunnelGeneratorCommands = (
  context: vscode.ExtensionContext
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand("valoride.generateFunnel", async () => {
      const inputs = await promptUserForFunnelInputs();
      const result = await callValkyrAI("generate_product_funnel", inputs);
      await displayFunnelResults(result);
    })
  );
};
```

### 2. Chat Interface Integration

```typescript
// valoride/src/services/chatService.ts
if (
  userMessage.includes("generate funnel") ||
  userMessage.includes("landing page")
) {
  const params = extractFunnelParams(userMessage);
  if (params.isComplete()) {
    const result = await funnelGeneratorService.generate(params);
    return formatFunnelResponse(result);
  } else {
    return askForMissingParams(params);
  }
}
```

### 3. SWARM Coordination

```typescript
// valoride/src/integrations/swarm/mothershipService.ts
swarmClient.on("FUNNEL_GENERATED", (payload) => {
  // Display notification
  vscode.window.showInformationMessage(
    `✅ Funnel generated for "${payload.offer}"`
  );

  // Open results in editor
  openFunnelResults(payload.contentDataId);
});
```

---

## 🎨 UI Components (React)

### Funnel Generator Form

```typescript
// web/src/components/FunnelGeneratorForm.tsx
import { useCreateGeneratedFunnelJobMutation } from '../api/GeneratedFunnelJobService';

export const FunnelGeneratorForm = () => {
  const [createJob, { isLoading }] = useCreateGeneratedFunnelJobMutation();

  const handleSubmit = async (values) => {
    const job = await createJob({
      inputParams: values
    }).unwrap();

    // Poll for completion
    pollJobStatus(job.id);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Input name="brand" label="Brand Name" required />
      <Input name="offer" label="Offer/Product" required />
      <Input name="targetAudience" label="Target Audience" required />
      <Select name="priceTier" options={priceTiers} required />
      <Input name="priceAmount" type="number" />
      <Select name="deliveryMode" options={deliveryModes} required />
      <Textarea name="heroBenefit" label="Hero Benefit" required />
      <Button type="submit" loading={isLoading}>
        Generate Funnel
      </Button>
    </Form>
  );
};
```

### Results Preview

```typescript
// web/src/components/FunnelResultsPreview.tsx
export const FunnelResultsPreview = ({ contentDataId }) => {
  const { data } = useGetContentDataQuery(contentDataId);

  return (
    <Tabs>
      <Tab label="PRD">
        <PRDViewer prd={data.prd} />
      </Tab>
      <Tab label="Landing Page">
        <LandingPagePreview sections={data.landingPageSections} />
      </Tab>
      <Tab label="Ads">
        <AdVariantsGrid variants={data.adVariants} />
      </Tab>
      <Tab label="Emails">
        <EmailSequenceTimeline emails={data.emailSequence} />
      </Tab>
    </Tabs>
  );
};
```

---

## 🧪 Testing Checklist

- [ ] Unit tests for FunnelGeneratorModule
- [ ] Integration tests for workflow execution
- [ ] E2E tests for ValorIDE command
- [ ] Manual test: Generate funnel via chat
- [ ] Manual test: Generate funnel via command palette
- [ ] Manual test: Preview landing page
- [ ] Manual test: Export to HTML

---

## 🚨 Error Handling

### Common Errors

**Missing OpenAI API Key**

```
Error: LLM adapter creation failed - missing API key
Solution: Set OPENAI_API_KEY environment variable
```

**Invalid Input Parameters**

```
Error: Missing required inputs: brand, offer, targetAudience
Solution: Validate inputs before calling module
```

**LLM Response Parsing Failed**

```
Error: Failed to parse JSON from LLM response
Solution: Retry with higher temperature or check prompt
```

---

## 📚 Related Documentation

- [FUNNEL_GENERATOR_README.md](../docs/FUNNEL_GENERATOR_README.md) — Full documentation
- [systemPatterns.md](../ValorIDE_docs/systemPatterns.md) — Architecture patterns
- [techContext.md](../ValorIDE_docs/techContext.md) — Technical context
- [README_SWARM.md](../ValorIDE/README_SWARM.md) — SWARM coordination

---

## 🔗 Quick Links

- **Module:** `valkyrai/src/main/java/com/valkyrlabs/workflow/modules/ai/FunnelGeneratorModule.java`
- **Schema:** `thorapi/src/main/resources/openapi/bundles/contentdata.yaml`
- **Template:** `valkyrai/src/main/resources/workflows/templates/digital-product-funnel-generator.json`
- **Tests:** `valkyrai/src/test/java/com/valkyrlabs/workflow/modules/ai/FunnelGeneratorModuleTests.java`

---

## 💡 Tips for AI Agents

1. **Extract parameters conversationally** — don't dump a form on the user
2. **Show progress** — "Generating PRD...", "Creating landing page...", etc.
3. **Preview before saving** — let user review/edit before persisting
4. **Suggest next steps** — "Want to publish the landing page?" or "Ready to set up email automation?"
5. **Use templates** — If user says "like Stack", use `templateId: 'saas-launch'`

---

_This integration guide is for AI coding agents working with ValkyrAI + ValorIDE ecosystem._
