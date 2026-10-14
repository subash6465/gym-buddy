> Standalone app: model policies and workflows are bundled into the APK. Keys are supplied by the user and stored in SecureStore; AI requests go directly to the provider. Server environment overrides described below apply only to the retained legacy server. Change the bundled policy and rebuild to alter mobile defaults.

# AI model routing

Verified against provider documentation on 14 October 2026. This implements stronger plans, photos, and summaries with economical routine chat and text meals. Pricing and provider access can change; actual fitness/nutrition quality requires evaluation with representative prompts and labeled photos.

## Model selection

Standard USD prices per million input/output tokens:

| Model | Input | Output | Cached input | Decision |
| --- | ---: | ---: | ---: | --- |
| GPT-6 Luna | $0.10 | $0.50 | $0.01 | Routine OpenAI tasks |
| GPT-6.1 Sol | $2 | $10 | $0.10 | Stronger OpenAI tasks |
| GPT-6 Sol | $2 | $10 | $0.20 | Compatible override; no uncached price advantage |
| Claude Haiku 5.5 | $0.10 | $0.50 | $0.01 | Routine Claude tasks; quoted rates apply up to 100k input tokens |
| Claude Sonnet 5.5 | $2 | $10 | $0.10 | Stronger Claude tasks |
| Claude Sonnet 5 | $2 | $10 | $0.20 | Compatible override; no uncached price advantage |
| Claude Opus 5 | $5 | $25 | $0.50 | Compatible override; 2.5x Sonnet 5.5 prices |

GPT-6.1 Sol has the same standard prices as GPT-6 Sol and lower cached-input prices. Sonnet 5.5 has the same standard prices as Sonnet 5 and lower cache-read prices. Opus 5 costs more than either Sonnet version; it also costs more than the newer Opus 5.5 ($4/$20). There is no Gym Buddy benchmark establishing that any older model performs on par, so the newer balanced models remain defaults. Overrides allow controlled comparisons without code changes.

Sources:

- [OpenAI pricing](https://developers.openai.com/api/docs/pricing)
- [GPT-6 Luna capabilities](https://developers.openai.com/api/docs/models/gpt-6-luna)
- [GPT-6.1 Sol capabilities](https://developers.openai.com/api/docs/models/gpt-6.1-sol)
- [GPT-6 Sol capabilities and pricing](https://developers.openai.com/api/docs/models/gpt-6-sol)
- [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Claude Sonnet 5](https://platform.claude.com/docs/en/models/sonnet-5/overview)
- [Claude Sonnet 5.5](https://platform.claude.com/docs/en/models/sonnet-5-5/overview)
- [Claude Opus 5](https://platform.claude.com/docs/en/models/opus-5/overview)
- [Claude Haiku 5.5](https://platform.claude.com/docs/en/models/haiku-5-5/overview)

## Request budgets and compatibility

| Task | Maximum output tokens | OpenAI default effort | Claude default effort |
| --- | ---: | --- | --- |
| Verification | 1,200 | none | low |
| Chat | 1,600 | none | low |
| Text meals | 1,200 | none | low |
| Photo meals | 2,400 | low | medium |
| Planning | 6,000 | medium | medium |
| Reviews | 3,000 | low | medium |

These are upper bounds, not expected usage or a quota charged in advance. Verification retains room for adaptive thinking before the short acknowledgement, rather than constraining it to visible reply length. OpenAI/Claude reasoning consumes the output budget. Google receives `generationConfig.maxOutputTokens`; it retains its existing thinking configuration. Gemini photo estimates now use Flash instead of Flash-Lite, while text meals remain on Flash-Lite. The Google strict-schema fallback retains the budget and deadline. Gemini caps should not be interpreted as a universal hard dollar ceiling for thinking across all model versions.

Known compatible alternative OpenAI models get supported effort levels: GPT-6 Sol allows `none`, GPT-6.1 Sol and Astra use at least `low`. Known Claude 5/5.5 overrides receive `output_config.effort`; other custom/legacy overrides omit effort. Operators must choose models that support the app's vision and structured-output requirements. The backend does not silently substitute another model when access is denied.

No new dependencies, app routes, native settings, or API response shapes are required. All routing is on the backend. Existing saved provider selections and encrypted keys continue to work. Migration requires removing old all-task environment overrides when task-specific values are not set.

## Reliability and cost measurement

Temporary failures retry up to twice after the first attempt, with exponential backoff and jitter, without resetting the request deadline. `Retry-After` seconds/dates and `retry-after-ms` are respected; if the requested wait cannot fit, the request fails without sending an early retry. Known permanent quota errors are not retried. HTTP 400/401/403/404 are not transport-retried; Gemini may perform its existing single schema-format fallback after HTTP 400. Refusals and output-limit responses are not automatically regenerated. Network retries can incur additional charges if a timed-out request already executed.

Optional `AI_USAGE_LOGGING=true` emits token usage for successful provider HTTP responses, including incomplete/refused responses when usage is present. It excludes personal data and secrets. OpenAI counts input/cache hits together; Claude reports uncached input, cache reads, and cache writes separately. Google output combines candidate and thought counts. These counters allow production averages to replace estimates. Usage logging does not itself impose account spending limits or create per-user billing records.

The earlier ~$2/user/month estimate assumes 750 chats, 180 text meals, 90 photo estimates, four plans, 30/7 weekly summaries, and one monthly summary, with assumed token lengths. Reasoning limits are designed to reduce routine cost, but actual consumption and image dimensions still determine the bill. This implementation does not add automatic premium chat escalation or cross-provider fan-out.

Sources:

- [OpenAI reasoning and output limits](https://developers.openai.com/api/docs/guides/reasoning)
- [OpenAI rate limits and retries](https://developers.openai.com/api/docs/guides/rate-limits)
- [Claude effort](https://platform.claude.com/docs/en/build-with-claude/effort)
- [Claude thinking billing](https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost)
- [Claude structured outputs and refusal/truncation behavior](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Claude API errors](https://platform.claude.com/docs/en/api/errors)
- [Google generation configuration](https://ai.google.dev/api/generate-content)

## Validation

Automated tests exercise HTTP key verification, registration, onboarding/profile previews, approvals without duplicate generations, text/photo meals, chat-to-plan routing, weekly/monthly reviews, saved-review reuse, and provider switching for OpenAI, Claude, and Gemini. Transport tests cover strict schemas, effort/output settings, reasoning exclusion, transient retries, permanent errors, deadline handling, refusals/truncation, and redacted usage metrics. Policy tests cover task overrides, legacy precedence, photo independence, and compatible alternative models.

Provider HTTP responses are mocked. These tests establish application wiring and regression coverage, not live key permissions, uptime, vision accuracy, or measured model quality. Validate live access and output quality with the deployment's provider credentials before release.
