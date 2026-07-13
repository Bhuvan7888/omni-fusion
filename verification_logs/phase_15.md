# Phase 15 structural-refactor verification

## Automated results

- Backend: `9 passed` (`backend/venv/bin/python -m pytest tests -q`).
- Frontend: production `npm run build` passed all 16 routes.
- Type safety: zero explicit `any` usages remain under `frontend/src`.
- Invalid link update regression: a dedicated test confirms missing IDs return 404.

## Inference equivalence

`backend/app/services/inference_service.py` and
`backend/app/models/networks.py` contain docstring-only changes. Their executable
scaling, checkpoint loading, forward pass, SHAP background, risk computation,
and Grad-CAM statements are unchanged. The Phase 13 scaling regression test and
all prediction tests pass after the refactor. IDs and timestamps remain the only
nondeterministic persistence fields.

## Pre-existing browser-suite limitation

The legacy Puppeteer scripts navigate to `/` and immediately look for an upload
input. The current product correctly presents the authenticated landing page at
that route, so `frontend/test_flow.js` stops before inference with a null upload
element. Making it pass requires test credentials and an authentication step;
bypassing production authentication would violate this phase's behavior rule.

## Deferred behavior decision

Backend analytics historically compares probability-valued risk scores against
`60.0`, while frontend presentation uses a `0.5` high-risk boundary. The value
was centralized without reconciling units because doing so would change a
computed patient count and visible risk classification. Product approval is
required before that behavior change.
