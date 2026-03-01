---
title: "Ecto"
description: "Work with databases in Elixir using Ecto -- define schemas, validate data with changesets, compose queries, run migrations, and manage transactions."
weight: 3
phase: 6
lesson: 28
difficulty: "advanced"
estimatedMinutes: 35
draft: false
date: 2025-02-23
prerequisites:
  - "/06-web-and-distributed/02-liveview"
hexdocsLinks:
  - title: "Ecto"
    url: "https://hexdocs.pm/ecto/Ecto.html"
  - title: "Ecto.Changeset"
    url: "https://hexdocs.pm/ecto/Ecto.Changeset.html"
  - title: "Ecto.Query"
    url: "https://hexdocs.pm/ecto/Ecto.Query.html"
  - title: "Ecto.Repo"
    url: "https://hexdocs.pm/ecto/Ecto.Repo.html"
tags:
  - ecto
  - database
  - schema
  - changeset
  - query
  - migrations
  - transactions
keyTakeaways:
  - "You can explain the core ideas in this lesson and when to apply them in Elixir projects"
  - "You can use the primary APIs and patterns shown here to build working solutions"
  - "You can spot common mistakes for this topic and choose more idiomatic approaches"
---

Ecto is Elixir's database toolkit. It is not an ORM in the traditional sense -- instead, Ecto gives you explicit, composable tools for mapping data to and from your database. Schemas define the shape of your data, changesets validate and track changes, queries compose with pipe-friendly syntax, and the repo provides a clean interface for all database operations.

## The Repo

The repo is your gateway to the database. Every database operation goes through it:

```elixir
defmodule MyApp.Repo do
  use Ecto.Repo,
    otp_app: :my_app,
    adapter: Ecto.Adapters.Postgres
end
```

The repo is started as part of your supervision tree and manages a connection pool under the hood. You use it directly for all CRUD operations:

{{< iex >}}
iex> alias MyApp.{Repo, Blog.Post}
iex> Repo.all(Post)
[%Post{id: 1, title: "Hello World", ...}, %Post{id: 2, title: "Ecto Guide", ...}]
iex> Repo.get!(Post, 1)
%Post{id: 1, title: "Hello World", body: "..."}
iex> Repo.get_by(Post, title: "Ecto Guide")
%Post{id: 2, title: "Ecto Guide", body: "..."}
iex> Repo.one(from p in Post, where: p.id == 1)
%Post{id: 1, title: "Hello World", body: "..."}
iex> Repo.aggregate(Post, :count)
2
{{< /iex >}}

{{< callout type="note" >}}
`Repo.get!/2` raises `Ecto.NoResultsError` if the record is not found, while `Repo.get/2` returns `nil`. In Phoenix controllers and LiveViews, the bang version is often preferred because Phoenix automatically converts the raised error into a 404 response.
{{< /callout >}}

## Schemas

Schemas define how Elixir structs map to database tables. They declare fields with types and establish the structure of your data:

```elixir
defmodule MyApp.Blog.Post do
  use Ecto.Schema
  import Ecto.Changeset

  schema "posts" do
    field :title, :string
    field :body, :string
    field :published, :boolean, default: false
    field :view_count, :integer, default: 0
    field :published_at, :utc_datetime

    belongs_to :author, MyApp.Accounts.User
    has_many :comments, MyApp.Blog.Comment
    many_to_many :tags, MyApp.Blog.Tag, join_through: "posts_tags"

    timestamps(type: :utc_datetime)
  end

  def changeset(post, attrs) do
    post
    |> cast(attrs, [:title, :body, :published, :published_at])
    |> validate_required([:title, :body])
    |> validate_length(:title, min: 3, max: 200)
    |> validate_length(:body, min: 10)
    |> unique_constraint(:title)
  end
end
```

The `schema` macro generates a struct with all the declared fields, plus `id`, `inserted_at`, and `updated_at` from `timestamps/1`. Associations like `belongs_to`, `has_many`, and `many_to_many` define relationships between schemas.

## Changesets

Changesets are the heart of Ecto's data validation story. A changeset tracks changes to a struct, validates them, and collects errors -- all before anything touches the database:

```elixir
defmodule MyApp.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  schema "users" do
    field :name, :string
    field :email, :string
    field :age, :integer
    field :password, :string, virtual: true
    field :password_hash, :string

    timestamps()
  end

  def registration_changeset(user, attrs) do
    user
    |> cast(attrs, [:name, :email, :age, :password])
    |> validate_required([:name, :email, :password])
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+\.[^\s]+$/, message: "must be a valid email")
    |> validate_length(:password, min: 8)
    |> validate_number(:age, greater_than: 0, less_than: 150)
    |> unique_constraint(:email)
    |> hash_password()
  end

  def profile_changeset(user, attrs) do
    user
    |> cast(attrs, [:name, :age])
    |> validate_required([:name])
    |> validate_number(:age, greater_than: 0, less_than: 150)
  end

  defp hash_password(changeset) do
    case get_change(changeset, :password) do
      nil -> changeset
      password -> put_change(changeset, :password_hash, Bcrypt.hash_pwd_salt(password))
    end
  end
end
```

{{< concept title="Changesets Are Not Just Validation" >}}
Changesets serve multiple purposes:

- **Casting** -- Only allowed fields are accepted from external input (protection against mass assignment)
- **Validation** -- Business rules are enforced before the database is touched
- **Constraint mapping** -- Database constraints (unique, foreign key) are converted to user-friendly errors
- **Change tracking** -- You can inspect exactly which fields changed and what their previous values were

Importantly, changesets are data structures. You can build them, inspect them, pass them around, and compose them with pipes. They are not side-effectful -- nothing happens to the database until you pass a changeset to `Repo.insert/1` or `Repo.update/1`.
{{< /concept >}}

{{% compare %}}
```elixir
# Ecto changeset -- explicit, composable validation
changeset =
  %User{}
  |> User.registration_changeset(%{
    name: "Ada",
    email: "bad-email",
    password: "short"
  })

changeset.valid?
# false

changeset.errors
# [
#   email: {"must be a valid email", [validation: :format]},
#   password: {"should be at least %{count} character(s)",
#     [count: 8, validation: :length, kind: :min]}
# ]
```

```python
# Django model -- validation mixed into save
class User(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    password = models.CharField(min_length=8)

try:
    user = User(name="Ada", email="bad-email", password="short")
    user.full_clean()  # Must remember to call this
    user.save()
except ValidationError as e:
    print(e.message_dict)
```
{{% /compare %}}

## Ecto.Query

Ecto provides a powerful, composable query DSL. Queries are built using pipe syntax and are only executed when passed to the repo:

```elixir
import Ecto.Query

# Simple queries
query = from p in Post, where: p.published == true, order_by: [desc: p.inserted_at]
Repo.all(query)

# Keyword syntax
query =
  from p in Post,
    where: p.published == true,
    where: p.view_count > 100,
    order_by: [desc: p.inserted_at],
    limit: 10,
    select: %{title: p.title, views: p.view_count}

# Pipe syntax -- great for building queries dynamically
Post
|> where([p], p.published == true)
|> where([p], p.view_count > 100)
|> order_by([p], desc: p.inserted_at)
|> limit(10)
|> select([p], %{title: p.title, views: p.view_count})
|> Repo.all()
```

Queries are composable, which means you can build them up piece by piece:

```elixir
defmodule MyApp.Blog do
  import Ecto.Query

  def list_posts(opts \\ []) do
    Post
    |> apply_published_filter(opts[:published])
    |> apply_author_filter(opts[:author_id])
    |> apply_sort(opts[:sort])
    |> apply_limit(opts[:limit])
    |> Repo.all()
  end

  defp apply_published_filter(query, nil), do: query
  defp apply_published_filter(query, true), do: where(query, [p], p.published == true)
  defp apply_published_filter(query, false), do: where(query, [p], p.published == false)

  defp apply_author_filter(query, nil), do: query
  defp apply_author_filter(query, author_id), do: where(query, [p], p.author_id == ^author_id)

  defp apply_sort(query, :oldest), do: order_by(query, [p], asc: p.inserted_at)
  defp apply_sort(query, _), do: order_by(query, [p], desc: p.inserted_at)

  defp apply_limit(query, nil), do: query
  defp apply_limit(query, limit), do: limit(query, ^limit)
end
```

{{< iex >}}
iex> import Ecto.Query
iex> query = from p in "posts", where: p.published == true, select: p.title
#Ecto.Query<from p0 in "posts", where: p0.published == true, select: p0.title>
iex> Repo.all(query)
["Hello World", "Ecto Guide", "Phoenix Tips"]
iex> Repo.all(from p in Post, join: c in assoc(p, :comments), group_by: p.id, select: {p.title, count(c.id)})
[{"Hello World", 5}, {"Ecto Guide", 12}]
{{< /iex >}}

## Associations and Preloading

Ecto does not lazy-load associations. You must explicitly preload them, which prevents the N+1 query problem by design:

```elixir
# Preload after fetching
posts = Repo.all(Post) |> Repo.preload([:author, :comments])

# Preload within the query (uses a join)
query =
  from p in Post,
    join: a in assoc(p, :author),
    preload: [author: a],
    where: a.name == "Ada"

Repo.all(query)

# Nested preloading
Repo.all(Post) |> Repo.preload([:author, comments: :user])
```

{{< callout type="warning" >}}
If you access an association that has not been preloaded, you will get an `Ecto.Association.NotLoaded` struct -- not an error, but not the data you want either. This is intentional. Ecto forces you to be explicit about when database queries happen, preventing hidden performance problems.
{{< /callout >}}

## Migrations

Migrations define changes to your database schema over time. They are versioned, reversible, and run in order:

```elixir
defmodule MyApp.Repo.Migrations.CreatePosts do
  use Ecto.Migration

  def change do
    create table(:posts) do
      add :title, :string, null: false
      add :body, :text
      add :published, :boolean, default: false
      add :view_count, :integer, default: 0
      add :published_at, :utc_datetime
      add :author_id, references(:users, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create index(:posts, [:author_id])
    create unique_index(:posts, [:title])
    create index(:posts, [:published, :inserted_at])
  end
end
```

Generate and run migrations with mix tasks:

```bash
# Generate a migration file
mix ecto.gen.migration create_posts

# Run all pending migrations
mix ecto.migrate

# Roll back the last migration
mix ecto.rollback

# Reset the database (drop, create, migrate)
mix ecto.reset
```

## Transactions

When you need multiple database operations to succeed or fail together, use transactions:

```elixir
defmodule MyApp.Shop do
  alias MyApp.Repo
  alias MyApp.Shop.{Order, LineItem, Inventory}

  def place_order(user, cart_items) do
    Repo.transaction(fn ->
      # Create the order
      {:ok, order} =
        %Order{}
        |> Order.changeset(%{user_id: user.id, status: "pending"})
        |> Repo.insert()

      # Create line items and decrement inventory
      Enum.each(cart_items, fn item ->
        {:ok, _line_item} =
          %LineItem{}
          |> LineItem.changeset(%{order_id: order.id, product_id: item.product_id, quantity: item.quantity})
          |> Repo.insert()

        {1, _} =
          from(i in Inventory,
            where: i.product_id == ^item.product_id and i.stock >= ^item.quantity
          )
          |> Repo.update_all(inc: [stock: -item.quantity])
      end)

      order
    end)
  end
end
```

For more complex transactions with named steps and automatic rollback, use `Ecto.Multi`:

```elixir
defmodule MyApp.Accounts do
  alias Ecto.Multi
  alias MyApp.Repo
  alias MyApp.Accounts.{User, Profile, AuditLog}

  def register_user(attrs) do
    Multi.new()
    |> Multi.insert(:user, User.registration_changeset(%User{}, attrs))
    |> Multi.insert(:profile, fn %{user: user} ->
      Profile.changeset(%Profile{}, %{user_id: user.id, display_name: user.name})
    end)
    |> Multi.insert(:audit_log, fn %{user: user} ->
      AuditLog.changeset(%AuditLog{}, %{
        action: "user_registered",
        user_id: user.id,
        metadata: %{email: user.email}
      })
    end)
    |> Repo.transaction()
    |> case do
      {:ok, %{user: user, profile: profile}} ->
        {:ok, user}

      {:error, :user, changeset, _changes} ->
        {:error, changeset}

      {:error, _step, changeset, _changes} ->
        {:error, changeset}
    end
  end
end
```

{{< concept title="Ecto.Multi for Complex Transactions" >}}
`Ecto.Multi` builds a pipeline of named operations that execute inside a single transaction. Each step can depend on the results of previous steps. If any step fails, the entire transaction rolls back and you get back the name of the failed step along with its error. This is far cleaner than nested `case` statements inside `Repo.transaction/1`, and it makes complex multi-step operations easy to read and test.
{{< /concept >}}

{{< iex >}}
iex> alias Ecto.Multi
iex> multi = Multi.new() |> Multi.insert(:post, Post.changeset(%Post{}, %{title: "Test"})) |> Multi.insert(:comment, fn %{post: post} -> Comment.changeset(%Comment{}, %{post_id: post.id, body: "First!"}) end)
%Ecto.Multi{operations: [...], names: MapSet.new([:post, :comment])}
iex> Repo.transaction(multi)
{:ok, %{post: %Post{id: 1, title: "Test"}, comment: %Comment{id: 1, body: "First!"}}}
{{< /iex >}}

{{< exercise title="Build a Blog Context with Ecto" >}}
Create a `Blog` context module that provides a clean API for working with posts and comments:

1. Define a `Post` schema with fields: `title` (string), `body` (text), `published` (boolean), `view_count` (integer). Add a `has_many` association with `Comment`.
2. Define a `Comment` schema with fields: `body` (text), `author_name` (string). Add a `belongs_to` association with `Post`.
3. Write a `Post.changeset/2` function that validates the title is at least 5 characters and the body is at least 20 characters.
4. Write a composable query function `list_posts/1` that accepts options for filtering by published status, sorting, and limiting results.
5. Write a `publish_post/1` function that sets `published` to `true` and `published_at` to the current time in a single update.
6. Write a `create_post_with_comment/2` function that uses `Ecto.Multi` to insert a post and its first comment atomically.

**Bonus:** Write a query that returns the top 5 posts by comment count using `join`, `group_by`, and `order_by`.
{{< /exercise >}}

## Summary

Ecto gives you full control over your data layer with explicit, composable tools. Schemas define the shape and associations of your data. Changesets validate and track changes before they reach the database. The query DSL lets you build queries incrementally with pipe syntax. Migrations manage your schema evolution, and transactions (both simple and via `Ecto.Multi`) ensure data consistency. The explicit nature of Ecto -- no lazy loading, no hidden queries, no magic -- means you always know exactly what your application is doing with your database.

## FAQ and Troubleshooting

### Why is my Ecto example failing even though the code looks right?
Most failures come from runtime context, not syntax: incorrect app configuration, missing dependencies, process lifecycle timing, or environment-specific settings. Re-run with smaller examples, inspect intermediate values, and verify each prerequisite from this lesson before combining patterns.

### How do I debug this topic in a production-like setup?
Start with reproducible local steps, add structured logs around boundaries, and isolate one moving part at a time. Prefer deterministic tests for the core logic, then layer integration checks for behavior that depends on supervisors, networked services, or external systems.

### What should I optimize first?
Prioritize correctness and observability before performance tuning. Once behavior is stable, profile the hot paths, remove unnecessary work, and only then introduce advanced optimizations.
