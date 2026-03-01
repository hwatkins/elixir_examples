---
title: "Phoenix Framework"
description: "Build modern web applications with Phoenix, Elixir's premier web framework. Covers routing, controllers, views, Plug middleware, channels, and project structure."
weight: 1
phase: 6
lesson: 26
difficulty: "advanced"
estimatedMinutes: 35
draft: false
date: 2025-02-23
prerequisites:
  - "/05-advanced-topics/05-sigils"
hexdocsLinks:
  - title: "Phoenix Framework"
    url: "https://hexdocs.pm/phoenix/overview.html"
  - title: "Phoenix.Router"
    url: "https://hexdocs.pm/phoenix/Phoenix.Router.html"
  - title: "Phoenix.Controller"
    url: "https://hexdocs.pm/phoenix/Phoenix.Controller.html"
  - title: "Plug"
    url: "https://hexdocs.pm/plug/readme.html"
tags:
  - phoenix
  - web
  - plug
  - router
  - controllers
  - components
keyTakeaways:
  - "You can explain the core ideas in this lesson and when to apply them in Elixir projects"
  - "You can use the primary APIs and patterns shown here to build working solutions"
  - "You can spot common mistakes for this topic and choose more idiomatic approaches"
---

Phoenix is the most popular web framework in the Elixir ecosystem. It leverages the Erlang VM's ability to handle millions of concurrent connections while maintaining developer productivity with conventions inspired by the best ideas in web development. Phoenix gives you real-time features out of the box, excellent performance, and a delightful developer experience.

## Creating a New Phoenix Project

Phoenix ships with a project generator that scaffolds everything you need. Install the generator with:

```bash
mix archive.install hex phx_new
```

Then create a new project:

```bash
mix phx.new my_app
cd my_app
mix deps.get
mix ecto.create
mix phx.server
```

This creates a full project structure with routing, controllers, HTML templates, asset pipelines, database configuration, and tests -- all wired together and ready to run.

{{< callout type="tip" >}}
If you do not need a database, pass `--no-ecto`. For an API-only project, pass `--no-html --no-assets`. Phoenix generators are highly configurable to fit your needs.
{{< /callout >}}

## Project Structure

A freshly generated Phoenix project has a well-organized directory layout:

```text
my_app/
  lib/
    my_app/              # Business logic (context modules, schemas)
      application.ex     # OTP Application supervision tree
      repo.ex            # Ecto repository
    my_app_web/          # Web-facing code
      components/        # Function components and layouts
      controllers/       # Request handlers
      endpoint.ex        # Entry point for all requests
      router.ex          # Route definitions
      telemetry.ex       # Telemetry events
  priv/
    repo/migrations/     # Database migrations
    static/              # Static assets served directly
  config/
    config.exs           # Compile-time configuration
    dev.exs              # Development overrides
    prod.exs             # Production overrides
    runtime.exs          # Runtime configuration
  test/                  # Test files
  mix.exs                # Project definition and dependencies
```

{{< concept title="The Context Boundary" >}}
Phoenix enforces a clear separation between your **business logic** (`lib/my_app/`) and your **web interface** (`lib/my_app_web/`). The business logic layer contains your domain -- schemas, queries, and business rules. The web layer contains everything HTTP-specific -- controllers, components, routers, and plugs. This separation means your core logic is reusable and testable independent of the web layer.
{{< /concept >}}

## The Endpoint

The endpoint is the entry point for every HTTP request. It is a Plug pipeline that handles concerns like static file serving, request parsing, session management, and logging before the request ever reaches your router.

```elixir
defmodule MyAppWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :my_app

  # Serve static files from priv/static
  plug Plug.Static,
    at: "/",
    from: :my_app,
    gzip: false,
    only: MyAppWeb.static_paths()

  # Code reloading in development
  if code_reloading? do
    socket "/phoenix/live_reload/socket", Phoenix.LiveReloader.Socket
    plug Phoenix.LiveReloader
    plug Phoenix.CodeReloader
  end

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()

  plug Plug.MethodOverride
  plug Plug.Head
  plug Plug.Session, @session_options
  plug MyAppWeb.Router
end
```

The endpoint is started as part of your application's supervision tree, which means it is automatically supervised and restarted if anything goes wrong.

## The Router

The router maps incoming HTTP requests to the correct controller action. Phoenix routers use a declarative DSL that reads naturally:

```elixir
defmodule MyAppWeb.Router do
  use MyAppWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {MyAppWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", MyAppWeb do
    pipe_through :browser

    get "/", PageController, :home
    resources "/posts", PostController
    live "/dashboard", DashboardLive
  end

  scope "/api", MyAppWeb.API, as: :api do
    pipe_through :api

    resources "/articles", ArticleController, only: [:index, :show, :create]
  end
end
```

The `resources` macro generates all standard RESTful routes:

{{< iex >}}
iex> MyAppWeb.Router.Helpers.post_path(MyAppWeb.Endpoint, :index)
"/posts"
iex> MyAppWeb.Router.Helpers.post_path(MyAppWeb.Endpoint, :show, 42)
"/posts/42"
iex> MyAppWeb.Router.Helpers.post_path(MyAppWeb.Endpoint, :new)
"/posts/new"
iex> MyAppWeb.Router.Helpers.post_path(MyAppWeb.Endpoint, :edit, 42)
"/posts/42/edit"
{{< /iex >}}

{{< callout type="note" >}}
Phoenix 1.7+ encourages **verified routes** over the older route helpers. Verified routes use the `~p` sigil and are checked at compile time: `~p"/posts/#{post}"`. They catch broken links before your code ever runs.
{{< /callout >}}

## Plugs

Plugs are the fundamental building block of Phoenix's request processing. A plug is any module that implements `init/1` and `call/2`, or simply a function that takes a connection and options. Everything in Phoenix -- from the endpoint to the router to authentication -- is built on plugs.

{{% compare %}}
```elixir
# Module plug -- reusable across your app
defmodule MyAppWeb.Plugs.RequireAuth do
  import Plug.Conn
  import Phoenix.Controller

  def init(opts), do: opts

  def call(conn, _opts) do
    if conn.assigns[:current_user] do
      conn
    else
      conn
      |> put_flash(:error, "You must log in to access this page.")
      |> redirect(to: ~p"/login")
      |> halt()
    end
  end
end
```

```elixir
# Function plug -- quick inline usage
defmodule MyAppWeb.PostController do
  use MyAppWeb, :controller

  plug :require_owner when action in [:edit, :update, :delete]

  defp require_owner(conn, _opts) do
    post = Repo.get!(Post, conn.params["id"])

    if post.user_id == conn.assigns.current_user.id do
      assign(conn, :post, post)
    else
      conn
      |> put_flash(:error, "Not authorized")
      |> redirect(to: ~p"/posts")
      |> halt()
    end
  end
end
```
{{% /compare %}}

## Controllers

Controllers handle incoming requests, coordinate with your business logic, and return responses. Each controller action receives the `conn` (a `Plug.Conn` struct) and `params` (a map of request parameters):

```elixir
defmodule MyAppWeb.PostController do
  use MyAppWeb, :controller

  alias MyApp.Blog

  def index(conn, _params) do
    posts = Blog.list_posts()
    render(conn, :index, posts: posts)
  end

  def show(conn, %{"id" => id}) do
    post = Blog.get_post!(id)
    render(conn, :show, post: post)
  end

  def create(conn, %{"post" => post_params}) do
    case Blog.create_post(post_params) do
      {:ok, post} ->
        conn
        |> put_flash(:info, "Post created successfully.")
        |> redirect(to: ~p"/posts/#{post}")

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, :new, changeset: changeset)
    end
  end

  def delete(conn, %{"id" => id}) do
    post = Blog.get_post!(id)
    {:ok, _post} = Blog.delete_post(post)

    conn
    |> put_flash(:info, "Post deleted successfully.")
    |> redirect(to: ~p"/posts")
  end
end
```

Notice how the controller is thin -- it delegates to `Blog` context functions for all business logic. The controller's only job is to translate between HTTP and your application.

## Components and Templates

Phoenix 1.7+ uses **function components** for rendering HTML. Components are plain Elixir functions that accept assigns and return HEEx (HTML + Embedded Elixir) templates:

```elixir
defmodule MyAppWeb.PostHTML do
  use MyAppWeb, :html

  embed_templates "post_html/*"

  attr :post, MyApp.Blog.Post, required: true

  def post_card(assigns) do
    ~H"""
    <article class="post-card">
      <h2><%= @post.title %></h2>
      <p><%= @post.summary %></p>
      <time datetime={@post.inserted_at}>
        <%= Calendar.strftime(@post.inserted_at, "%B %d, %Y") %>
      </time>
      <.link navigate={~p"/posts/#{@post}"}>Read more</.link>
    </article>
    """
  end
end
```

Components are composable. You can call one component from another using the `<.component_name />` syntax. Phoenix ships with a `CoreComponents` module that provides buttons, forms, tables, modals, and more out of the box.

{{< concept title="The Request Lifecycle" >}}
Every Phoenix request flows through a predictable pipeline:

1. **Endpoint** -- Static files, parsing, sessions, security headers
2. **Router** -- Matches the URL and HTTP method to a pipeline and action
3. **Pipeline** -- A series of plugs that prepare the connection (e.g., `:browser` adds CSRF protection)
4. **Controller** -- Receives the prepared connection, calls business logic, and renders a response
5. **Component/Template** -- Generates the HTML (or JSON) response body

At each stage, the `%Plug.Conn{}` struct is transformed and passed along. If any plug calls `halt()`, the pipeline stops and the current response is sent back to the client.
{{< /concept >}}

## JSON APIs

Phoenix makes it straightforward to build JSON APIs. Use `Phoenix.Controller.json/2` or define a JSON component:

```elixir
defmodule MyAppWeb.API.ArticleController do
  use MyAppWeb, :controller

  alias MyApp.Blog

  def index(conn, _params) do
    articles = Blog.list_articles()
    json(conn, %{data: Enum.map(articles, &article_json/1)})
  end

  def show(conn, %{"id" => id}) do
    article = Blog.get_article!(id)
    json(conn, %{data: article_json(article)})
  end

  defp article_json(article) do
    %{
      id: article.id,
      title: article.title,
      body: article.body,
      published_at: article.published_at
    }
  end
end
```

{{< iex >}}
iex> Phoenix.json_library()
Jason
iex> Jason.encode!(%{hello: "world"})
"{\"hello\":\"world\"}"
iex> Jason.decode!("{\"hello\":\"world\"}")
%{"hello" => "world"}
{{< /iex >}}

## Useful Mix Tasks

Phoenix provides several generators and utility tasks that accelerate development:

```bash
# Generate a complete HTML resource (context, schema, migration, controller, templates)
mix phx.gen.html Blog Post posts title:string body:text published:boolean

# Generate a JSON API resource
mix phx.gen.json Blog Article articles title:string body:text

# Generate a LiveView resource
mix phx.gen.live Blog Post posts title:string body:text

# Generate only a context and schema (no web layer)
mix phx.gen.context Blog Post posts title:string body:text

# List all routes
mix phx.routes

# Start an interactive console with your app loaded
iex -S mix phx.server
```

{{< exercise title="Build a Phoenix JSON API" >}}
Create a new Phoenix project and build a simple JSON API for a bookshelf application:

1. Generate a new project with `mix phx.new bookshelf --no-html --no-assets`
2. Create a `Library` context with a `Book` schema that has `title`, `author`, and `isbn` fields
3. Define API routes under `/api/books` that support listing all books and showing a single book
4. Write a controller that returns JSON responses
5. Add a custom plug that logs the request path and method to the console

**Bonus:** Add a `POST /api/books` endpoint that validates the incoming data and returns appropriate error responses (422 for validation errors, 201 for successful creation).
{{< /exercise >}}

## Summary

Phoenix gives you a productive, convention-driven framework that leverages the BEAM's strengths. The architecture -- endpoint, router, pipelines, controllers, components -- provides clear separation of concerns while keeping request processing fast and transparent. Plugs compose cleanly at every layer, and the context pattern keeps your business logic independent from your web interface. In the next lesson, you will explore LiveView, which builds on Phoenix to deliver rich, real-time user interfaces without writing JavaScript.

## FAQ and Troubleshooting

### Why is my Phoenix Framework example failing even though the code looks right?
Most failures come from runtime context, not syntax: incorrect app configuration, missing dependencies, process lifecycle timing, or environment-specific settings. Re-run with smaller examples, inspect intermediate values, and verify each prerequisite from this lesson before combining patterns.

### How do I debug this topic in a production-like setup?
Start with reproducible local steps, add structured logs around boundaries, and isolate one moving part at a time. Prefer deterministic tests for the core logic, then layer integration checks for behavior that depends on supervisors, networked services, or external systems.

### What should I optimize first?
Prioritize correctness and observability before performance tuning. Once behavior is stable, profile the hot paths, remove unnecessary work, and only then introduce advanced optimizations.
