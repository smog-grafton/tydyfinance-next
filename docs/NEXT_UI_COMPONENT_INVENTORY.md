# Tydy Finance Next.js UI component inventory

**Audited:** 2026-11-10  
**Template:** Rizz Next.js TypeScript, Next 14.2 App Router, React 18, Bootstrap 5/React Bootstrap and SCSS.

## Application architecture found

- Routes use `src/app` with `(admin)` and `(other)` route groups. The current admin layout is the reusable `TopNavigationBar`, `VerticalNavigationBar`, page wrapper and `Footer`.
- Layout state, light/dark mode and sidebar collapse are already implemented through `LayoutProvider`. Preserve these rather than introducing a new design system.
- `AppProvidersWrapper` provides the notification context and Sonner toast layer. Authentication is now Laravel-session based; no NextAuth provider is mounted.
- `src/assets/data/menu-items.ts` now exposes only the valid dashboard route. Expand it only as each policy-backed Tydy route is accepted, retaining the `AppMenu` hierarchy and styling.
- The existing login page retains the template card/form components and now calls the Laravel CSRF/session API. Demo OAuth, registration and password-reset links were removed because they have no corresponding backend workflow yet.

## Reuse inventory

| UI need | Existing implementation | Tydy use |
| --- | --- | --- |
| Application shell | `components/layout/VerticalNavigationBar`, `TopNavigationBar`, `Footer`, `LogoBox` | Keep the existing responsive shell; replace labels, logo, links and profile/notification data. |
| Dashboard cards/charts | `dashboard/analytics/*`, `dashboard/ecommerce/*`, `react-apexcharts`, Chart.js, Toast charts | Adapt cards and Apex visual language for real Laravel-provided finance/fleet read models. |
| Tables | `components/Table`, `components/Table/Pagination`, `tables/data-tables`, TanStack Table | Server-paginated accounts, payments, drivers, vehicles, schedules and audit history. |
| Form inputs/validation | `components/form/*`, React Hook Form, Yup, `forms/validation` | Laravel validation errors mapped into existing input feedback. |
| Complex flow | `forms/wizard`, `react-step-wizard` | Acquisition and recruitment journeys; do not use for short financial actions. |
| Select/search | `react-select`, `SelectFormInput` | API-backed meaningful entity/account/driver/vehicle selectors; never raw IDs. |
| Date/calendar | `DateFormInput`, Flatpickr, FullCalendar examples | Dates in Africa/Kampala, obligation calendar, visits and maintenance. |
| Upload | `FileUploader`, React Dropzone/FilePond examples | Private document/evidence inputs with Laravel-issued authorized metadata. |
| Feedback/confirmations | Sonner, SweetAlert and `ui/modals` | Backend-confirmed success/errors and confirmations for protected actions. |
| Tabs/timelines/profiles | `ui/tabs-accordion`, `pages/timeline`, `pages/profile` | Vehicle/driver profiles with activity, finance, maintenance and documents. |
| Loading/empty states | `FallbackLoading`, `Spinner`, chart/table patterns | Add route-level loading and API error/empty views without changing template styling. |

## Required adaptation standards

- New business routes live beside the existing App Router structure; the template’s demo routes remain reusable reference material until a replacement is accepted.
- Use server rendering for initial authenticated read data when the session/API client supports it. Keep interaction-heavy forms/charts as client islands.
- Use a shared UGX formatter and `Africa/Kampala` date formatter supplied by the migration API client. Do not calculate financial truth in a chart or React component.
- Reuse Bootstrap spacing, typography, cards, badges, collapse behaviour and theme tokens. Do not add another component framework.
- Build pages from workflows: vehicle acquisition, recruitment, remittance and payment dialogs—not one generic CRUD screen per database model.

## Current blockers

The template still has extensive demo pages/data and mixed package-manager lockfiles. The hard-coded NextAuth credentials and client-only protection have been removed; the real Laravel API client and SSR session guard are in place. Add navigation only for accepted business routes, and consolidate package-manager lockfiles before production packaging.
