---
name: design-system-markopolo-ai
description: Creates implementation-ready design-system guidance with tokens, component behavior, and accessibility standards. Use when creating or updating UI rules, component specifications, or design-system documentation.
---

<!-- TYPEUI_SH_MANAGED_START -->

# Markopolo AI

## Mission
Deliver implementation-ready design-system guidance for Markopolo AI that can be applied consistently across marketing site interfaces.

## Brand
- Product/brand: Markopolo AI
- URL: https://markopolo.ai/
- Audience: online shoppers and consumers
- Product surface: marketing site

## Style Foundations
- Visual style: structured, accessible, implementation-first
- Main font style: `font.family.primary=Booton-TRIAL Light`, `font.family.stack=Booton-TRIAL Light, Booton-TRIAL Light Placeholder, sans-serif`, `font.size.base=13px`, `font.weight.base=300`, `font.lineHeight.base=19.5px`
- Typography scale: `font.size.xs=8px`, `font.size.sm=10px`, `font.size.md=12px`, `font.size.lg=13px`, `font.size.xl=14px`, `font.size.2xl=16px`, `font.size.3xl=20px`, `font.size.4xl=28px`
- Color palette: `color.text.primary=#ffffff`, `color.surface.base=#000000`, `color.text.tertiary=#cccccc`, `color.text.inverse=#0000ee`, `color.surface.muted=#d8fe91`, `color.surface.strong=#0f0f0f`
- Spacing scale: `space.1=2px`, `space.2=5px`, `space.3=8px`, `space.4=10px`, `space.5=12px`, `space.6=13px`, `space.7=15px`, `space.8=20px`
- Radius/shadow/motion tokens: `radius.xs=4px`, `radius.sm=8px`, `radius.md=16px`, `radius.lg=40px`, `radius.xl=50px`, `radius.2xl=100px`

## Accessibility
- Target: WCAG 2.2 AA
- Keyboard-first interactions required.
- Focus-visible rules required.
- Contrast constraints required.

## Writing Tone
concise, confident, implementation-focused

## Rules: Do
- Use semantic tokens, not raw hex values in component guidance.
- Every component must define required states: default, hover, focus-visible, active, disabled, loading, error.
- Responsive behavior and edge-case handling should be specified for every component family.
- Accessibility acceptance criteria must be testable in implementation.

## Rules: Don't
- Do not allow low-contrast text or hidden focus indicators.
- Do not introduce one-off spacing or typography exceptions.
- Do not use ambiguous labels or non-descriptive actions.

## Guideline Authoring Workflow
1. Restate design intent in one sentence.
2. Define foundations and tokens.
3. Define component anatomy, variants, and interactions.
4. Add accessibility acceptance criteria.
5. Add anti-patterns and migration notes.
6. End with QA checklist.

## Required Output Structure
- Context and goals
- Design tokens and foundations
- Component-level rules (anatomy, variants, states, responsive behavior)
- Accessibility requirements and testable acceptance criteria
- Content and tone standards with examples
- Anti-patterns and prohibited implementations
- QA checklist

## Component Rule Expectations
- Include keyboard, pointer, and touch behavior.
- Include spacing and typography token requirements.
- Include long-content, overflow, and empty-state handling.

## Quality Gates
- Every non-negotiable rule must use "must".
- Every recommendation should use "should".
- Every accessibility rule must be testable in implementation.
- Prefer system consistency over local visual exceptions.

<!-- TYPEUI_SH_MANAGED_END -->
