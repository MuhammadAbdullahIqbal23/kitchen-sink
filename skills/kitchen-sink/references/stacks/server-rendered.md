# Server-rendered: Rails, Django, Flask, Laravel, Symfony, Phoenix, Spring, ASP.NET, Blazor, Go templ, WordPress, Shopify

The shared approach: a template renders the project's partials or components. Tokens come through a CSS file from `tokens.mjs flatten --format css`, placed wherever the framework's asset pipeline expects. Controls are a small script that sets `data-theme` and `dir` on `<html>`. Forced states use the `[data-force-state]` selector pattern from `sink-spec.md`.

If Tailwind or Bootstrap is installed, map tokens to its theme, as the React adapter describes for Tailwind. For Bootstrap, override its CSS variables and Sass variables.

## By framework

| Framework | Reusable unit | Sink location | Gate |
| --- | --- | --- | --- |
| Rails | Partials, ViewComponent | `KitchenSinkController` and `app/views/kitchen_sink/`. If `lookbook` is installed, use previews. | `if Rails.env.development?` around the route in `config/routes.rb` |
| Django | Templates, `{% include %}`, django-components | App `kitchen_sink` with a view and template | Add the URL only `if settings.DEBUG` |
| Flask, FastAPI with Jinja | Macros, includes | Blueprint or router with one template | Register only when in debug or dev mode |
| Laravel | Blade components, Livewire | `resources/views/kitchen-sink.blade.php` | `if (app()->environment('local'))` in `routes/web.php` |
| Symfony | Twig components | Controller with a Twig template | Put the route in `config/routes/dev/` |
| Phoenix | Function components in `core_components.ex` | LiveView or controller page | Put the route in the `if Application.compile_env(:app, :dev_routes)` block |
| Spring with Thymeleaf | Fragments | Controller and template | `@Profile("dev")` on the controller |
| ASP.NET Razor | Partials, Tag Helpers, View Components | `Pages/KitchenSink.cshtml` | `if (!env.IsDevelopment()) return NotFound();` |
| Blazor | Razor components | `Components/Pages/KitchenSink.razor` with `@page` | Inject `IWebHostEnvironment` and call `Nav.NavigateTo("/")` outside Development. Check the render mode, since a static page can't run interactive controls. WebAssembly components run in the browser, so they use `IWebAssemblyHostEnvironment` and their code ships regardless. Put the sink in a server-only component or a separate project there. |
| Go templ | `templ` components | `kitchensink.templ` | Register the handler behind a build tag or env check. Run `templ generate`. |
| WordPress | Blocks, `template-parts` | Page template, or a block pattern for block themes | `if ( ! current_user_can('edit_theme_options') ) wp_die();` plus `WP_DEBUG`. Also add `noindex`. |
| Shopify | Sections, snippets | `templates/page.kitchen-sink.liquid` | Unpublished page, or check `request.design_mode`. Tell the user a page template can be reached by anyone with the link once assigned. |

## Pitfalls

- Partials often need data. Pass realistic stub values from the sink's view, and never query production data.
- CSRF tokens and form posts: sample forms mustn't submit, so use `onsubmit="return false"` or a stub.
- Auth middleware may block the route. Don't weaken it globally. Add the route in a development-only way, and tell the user if login is still required.
- Asset pipelines (Sprockets, Propshaft, Vite, webpack, `collectstatic`) need the new CSS registered, or the page comes out unstyled.
- Livewire, LiveView, Hotwire and Blazor components are stateful, so an interactive sample needs the real connection. Fall back to `live` state values.
- Verification: run the framework's checks (`rails test`, `python manage.py check`, `php artisan test`, `mix compile`, `dotnet build`), and then open the route using its dev server.
