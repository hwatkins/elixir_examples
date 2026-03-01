---
title: "LiveView"
description: "Build rich, real-time user interfaces with Phoenix LiveView -- server-rendered HTML over WebSockets with live navigation, streams, components, and form handling."
weight: 2
phase: 6
lesson: 27
difficulty: "advanced"
estimatedMinutes: 35
draft: false
date: 2025-02-23
prerequisites:
  - "/06-web-and-distributed/01-phoenix"
hexdocsLinks:
  - title: "Phoenix LiveView"
    url: "https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.html"
  - title: "Phoenix.Component"
    url: "https://hexdocs.pm/phoenix_live_view/Phoenix.Component.html"
  - title: "LiveView Streams"
    url: "https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.html#stream/4"
tags:
  - liveview
  - real-time
  - websocket
  - phoenix
  - components
keyTakeaways:
  - "You can explain the core ideas in this lesson and when to apply them in Elixir projects"
  - "You can use the primary APIs and patterns shown here to build working solutions"
  - "You can spot common mistakes for this topic and choose more idiomatic approaches"
---

Phoenix LiveView lets you build rich, interactive user interfaces without writing custom JavaScript. It works by maintaining a persistent WebSocket connection between the browser and the server. When something changes, LiveView computes the minimal diff and pushes only the changed parts over the wire. The result is a snappy, real-time experience backed entirely by server-side Elixir code.

## How LiveView Works

A LiveView is an Elixir process (a GenServer under the hood) that manages state in its assigns and re-renders HTML when that state changes. The lifecycle looks like this:

1. **HTTP request** -- The initial page load renders HTML on the server (great for SEO and first paint)
2. **WebSocket connection** -- The client JavaScript connects back via WebSocket
3. **Live mount** -- The LiveView process starts and initializes its state
4. **Events** -- User interactions (clicks, form submissions, key presses) are sent to the server
5. **State updates** -- The server updates assigns, re-renders, and diffs are pushed to the client

{{< concept title="LiveView Is a Process" >}}
Each connected user gets their own LiveView process on the server. This process holds the current state (assigns), handles events, and re-renders when assigns change. Because it is a regular Erlang process, it can receive messages from other processes, subscribe to PubSub topics, and use all the concurrency tools you already know. If the WebSocket disconnects, the process terminates and a fresh one is started when the client reconnects.
{{< /concept >}}

## Mount, Render, and Handle Events

Every LiveView module implements three core callbacks:

```elixir
defmodule MyAppWeb.CounterLive do
  use MyAppWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, count: 0)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="counter">
      <h1>Count: <%= @count %></h1>
      <button phx-click="increment">+</button>
      <button phx-click="decrement">-</button>
      <button phx-click="reset">Reset</button>
    </div>
    """
  end

  @impl true
  def handle_event("increment", _params, socket) do
    {:noreply, update(socket, :count, &(&1 + 1))}
  end

  def handle_event("decrement", _params, socket) do
    {:noreply, update(socket, :count, &(&1 - 1))}
  end

  def handle_event("reset", _params, socket) do
    {:noreply, assign(socket, count: 0)}
  end
end
```

Wire this up in your router and you have a fully interactive counter with zero JavaScript:

```elixir
# In router.ex
live "/counter", CounterLive
```

{{< callout type="tip" >}}
The `mount/3` callback is called twice -- once for the initial HTTP request (where `connected?(socket)` returns `false`) and again when the WebSocket connects (where it returns `true`). Use this to defer expensive work until the socket is actually connected: load lightweight defaults on the first mount, then fetch full data on the connected mount.
{{< /callout >}}

## Working with Assigns

Assigns are the state of your LiveView. When you change assigns, LiveView automatically re-renders only the parts of the template that depend on those changed assigns.

```elixir
defmodule MyAppWeb.SearchLive do
  use MyAppWeb, :live_view

  alias MyApp.Catalog

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     assign(socket,
       query: "",
       results: [],
       loading: false
     )}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="search">
      <form phx-change="search" phx-submit="search">
        <input
          type="text"
          name="query"
          value={@query}
          placeholder="Search products..."
          phx-debounce="300"
        />
      </form>

      <div :if={@loading} class="spinner">Searching...</div>

      <ul :if={@results != []}>
        <li :for={product <- @results}>
          <%= product.name %> -- $<%= product.price %>
        </li>
      </ul>

      <p :if={@query != "" && @results == [] && !@loading}>
        No results found for "<%= @query %>"
      </p>
    </div>
    """
  end

  @impl true
  def handle_event("search", %{"query" => query}, socket) do
    results = Catalog.search_products(query)
    {:noreply, assign(socket, query: query, results: results, loading: false)}
  end
end
```

Notice the `:if` and `:for` attributes -- these are special HEEx attributes that conditionally render or loop over elements. The `phx-debounce="300"` attribute throttles the event so you do not fire a search on every keystroke.

## Forms and Validation

LiveView provides real-time form validation. As the user types, changesets are validated on the server and errors are pushed back instantly:

```elixir
defmodule MyAppWeb.RegistrationLive do
  use MyAppWeb, :live_view

  alias MyApp.Accounts
  alias MyApp.Accounts.User

  @impl true
  def mount(_params, _session, socket) do
    changeset = Accounts.change_user(%User{})
    {:ok, assign(socket, form: to_form(changeset))}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <.simple_form for={@form} phx-change="validate" phx-submit="save">
      <.input field={@form[:name]} label="Name" />
      <.input field={@form[:email]} label="Email" type="email" />
      <.input field={@form[:password]} label="Password" type="password" />
      <:actions>
        <.button>Create Account</.button>
      </:actions>
    </.simple_form>
    """
  end

  @impl true
  def handle_event("validate", %{"user" => user_params}, socket) do
    changeset =
      %User{}
      |> Accounts.change_user(user_params)
      |> Map.put(:action, :validate)

    {:noreply, assign(socket, form: to_form(changeset))}
  end

  def handle_event("save", %{"user" => user_params}, socket) do
    case Accounts.create_user(user_params) do
      {:ok, _user} ->
        {:noreply,
         socket
         |> put_flash(:info, "Account created!")
         |> push_navigate(to: ~p"/login")}

      {:error, changeset} ->
        {:noreply, assign(socket, form: to_form(changeset))}
    end
  end
end
```

{{% compare %}}
```elixir
# LiveView real-time form (Elixir only, no JS)
def handle_event("validate", %{"user" => params}, socket) do
  changeset =
    %User{}
    |> Accounts.change_user(params)
    |> Map.put(:action, :validate)

  {:noreply, assign(socket, form: to_form(changeset))}
end
```

```javascript
// Traditional approach (requires custom JavaScript)
form.addEventListener('input', async (e) => {
  const response = await fetch('/api/validate', {
    method: 'POST',
    body: JSON.stringify(Object.fromEntries(new FormData(form)))
  });
  const errors = await response.json();
  displayErrors(errors);
});
```
{{% /compare %}}

## Live Navigation

LiveView supports navigating between pages without full page reloads. This gives you single-page-app behavior while keeping server-side rendering:

```elixir
defmodule MyAppWeb.PostLive.Index do
  use MyAppWeb, :live_view

  alias MyApp.Blog

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, posts: Blog.list_posts())}
  end

  @impl true
  def handle_params(params, _uri, socket) do
    # Called on mount and on every live navigation
    case params do
      %{"sort" => sort} ->
        {:noreply, assign(socket, posts: Blog.list_posts(sort: sort))}

      _ ->
        {:noreply, socket}
    end
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <.link patch={~p"/posts?sort=newest"}>Newest</.link>
      <.link patch={~p"/posts?sort=oldest"}>Oldest</.link>

      <.link :for={post <- @posts} navigate={~p"/posts/#{post}"}>
        <%= post.title %>
      </.link>
    </div>
    """
  end
end
```

{{< callout type="note" >}}
`patch` updates the URL and calls `handle_params/3` on the **same** LiveView -- use it for sorting, filtering, or pagination. `navigate` kills the current LiveView process and mounts a **new** one -- use it for moving between different pages.
{{< /callout >}}

## Live Components

Live components are stateful, reusable pieces of UI that run inside a parent LiveView. They have their own assigns, handle their own events, and update independently:

```elixir
defmodule MyAppWeb.Components.TodoItem do
  use MyAppWeb, :live_component

  @impl true
  def mount(socket) do
    {:ok, assign(socket, editing: false)}
  end

  @impl true
  def update(assigns, socket) do
    {:ok, assign(socket, assigns)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="todo-item" id={"todo-#{@todo.id}"}>
      <input
        type="checkbox"
        checked={@todo.completed}
        phx-click="toggle"
        phx-target={@myself}
      />

      <span :if={!@editing}><%= @todo.title %></span>

      <form :if={@editing} phx-submit="save" phx-target={@myself}>
        <input type="text" name="title" value={@todo.title} />
        <button type="submit">Save</button>
      </form>

      <button phx-click="edit" phx-target={@myself}>Edit</button>
      <button phx-click="delete" phx-value-id={@todo.id} phx-target={@myself}>Delete</button>
    </div>
    """
  end

  @impl true
  def handle_event("toggle", _params, socket) do
    todo = Todos.toggle(socket.assigns.todo)
    {:noreply, assign(socket, todo: todo)}
  end

  def handle_event("edit", _params, socket) do
    {:noreply, assign(socket, editing: true)}
  end

  def handle_event("save", %{"title" => title}, socket) do
    todo = Todos.update_title(socket.assigns.todo, title)
    {:noreply, assign(socket, todo: todo, editing: false)}
  end

  def handle_event("delete", %{"id" => id}, socket) do
    Todos.delete(id)
    send(self(), {:todo_deleted, id})
    {:noreply, socket}
  end
end
```

Use the component from a parent LiveView:

```elixir
# In the parent LiveView template
<.live_component
  :for={todo <- @todos}
  module={MyAppWeb.Components.TodoItem}
  id={todo.id}
  todo={todo}
/>
```

The `phx-target={@myself}` attribute routes events to the component rather than the parent LiveView. This encapsulation lets components manage their own behavior.

## Streams

Streams let you manage large collections efficiently without holding every item in memory. Instead of keeping a full list in assigns, streams send append/prepend/delete instructions to the client DOM:

```elixir
defmodule MyAppWeb.TimelineLive do
  use MyAppWeb, :live_view

  alias MyApp.Social

  @impl true
  def mount(_params, _session, socket) do
    if connected?(socket) do
      Social.subscribe_to_timeline()
    end

    posts = Social.list_recent_posts(limit: 20)
    {:ok, stream(socket, :posts, posts)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div id="timeline" phx-update="stream">
      <article :for={{dom_id, post} <- @streams.posts} id={dom_id}>
        <strong><%= post.author.name %></strong>
        <p><%= post.body %></p>
        <time><%= post.inserted_at %></time>
      </article>
    </div>
    """
  end

  @impl true
  def handle_info({:new_post, post}, socket) do
    {:noreply, stream_insert(socket, :posts, post, at: 0)}
  end

  def handle_info({:post_deleted, post}, socket) do
    {:noreply, stream_delete(socket, :posts, post)}
  end
end
```

{{< concept title="Streams vs. Regular Assigns" >}}
With regular assigns, LiveView must track the entire list in server memory and diff the whole thing on every render. With streams, the server only sends incremental operations -- insert, delete, or replace individual items. This makes streams essential for feeds, chat messages, logs, and any collection that grows over time. A stream can handle tens of thousands of items without straining server memory.
{{< /concept >}}

## Real-Time Updates with PubSub

LiveView integrates naturally with Phoenix PubSub for real-time updates across all connected clients:

```elixir
defmodule MyAppWeb.ChatLive do
  use MyAppWeb, :live_view

  alias MyApp.Chat

  @impl true
  def mount(%{"room_id" => room_id}, _session, socket) do
    if connected?(socket) do
      Phoenix.PubSub.subscribe(MyApp.PubSub, "room:#{room_id}")
    end

    messages = Chat.list_messages(room_id)

    {:ok,
     socket
     |> assign(room_id: room_id)
     |> stream(:messages, messages)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div id="chat-messages" phx-update="stream">
      <div :for={{dom_id, msg} <- @streams.messages} id={dom_id} class="message">
        <strong><%= msg.user.name %>:</strong> <%= msg.body %>
      </div>
    </div>

    <form phx-submit="send_message">
      <input type="text" name="body" placeholder="Type a message..." autocomplete="off" />
      <button type="submit">Send</button>
    </form>
    """
  end

  @impl true
  def handle_event("send_message", %{"body" => body}, socket) do
    {:ok, message} = Chat.send_message(socket.assigns.room_id, body)
    Phoenix.PubSub.broadcast(MyApp.PubSub, "room:#{socket.assigns.room_id}", {:new_message, message})
    {:noreply, socket}
  end

  @impl true
  def handle_info({:new_message, message}, socket) do
    {:noreply, stream_insert(socket, :messages, message)}
  end
end
```

{{< iex >}}
iex> Phoenix.PubSub.subscribe(MyApp.PubSub, "room:lobby")
:ok
iex> Phoenix.PubSub.broadcast(MyApp.PubSub, "room:lobby", {:new_message, %{body: "Hello!"}})
:ok
iex> flush()
{:new_message, %{body: "Hello!"}}
:ok
{{< /iex >}}

{{< exercise title="Build a Real-Time Todo List" >}}
Build a LiveView-powered todo list with the following features:

1. Create a `TodoLive` module that mounts with an empty list of todos
2. Add a form at the top that lets users type a todo title and submit it (use `phx-submit`)
3. Display the list of todos, each with a checkbox to toggle completion and a delete button
4. Use `stream/3` to manage the todo list instead of a regular list assign
5. Extract each todo item into a live component with its own edit capability
6. **Bonus:** Use PubSub so that when one user adds a todo, all connected users see it instantly

Think about: What happens to the LiveView process when a user navigates away? How does the stream handle items being inserted and deleted? What is the role of `@myself` in the live component's event handlers?
{{< /exercise >}}

## Summary

LiveView brings real-time interactivity to Phoenix applications with pure server-side Elixir. The programming model is straightforward: mount state, render HTML, handle events. Streams make it efficient to manage large collections, live components let you encapsulate reusable stateful UI, and PubSub integration means broadcasting updates to all connected users is trivial. Because each LiveView is just a process, you have all the power of OTP at your disposal -- supervision, message passing, and concurrent computation all work naturally within LiveView.

## FAQ and Troubleshooting

### Why is my LiveView example failing even though the code looks right?
Most failures come from runtime context, not syntax: incorrect app configuration, missing dependencies, process lifecycle timing, or environment-specific settings. Re-run with smaller examples, inspect intermediate values, and verify each prerequisite from this lesson before combining patterns.

### How do I debug this topic in a production-like setup?
Start with reproducible local steps, add structured logs around boundaries, and isolate one moving part at a time. Prefer deterministic tests for the core logic, then layer integration checks for behavior that depends on supervisors, networked services, or external systems.

### What should I optimize first?
Prioritize correctness and observability before performance tuning. Once behavior is stable, profile the hot paths, remove unnecessary work, and only then introduce advanced optimizations.
