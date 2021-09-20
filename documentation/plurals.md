# Plurals

When creating a translation key with the `POST /api/v1/projects/{project_id}/translations` endpoint, you need to provide the following request body:
```json
{
  "name": string,
  "group_id": integer,
  "is_plural": boolean
}
```

## Creating a translation_value

If `is_plural` is set to `true`, you need to provide a `quantity_string` when creating a translation_value:
```json
{
  "name": "a new value of a plural key",
  "language_id": "1",
  "quantity_string": "one"
}
```

`quantity_string` is one of: `"zero"`, `"one"` or `"other"`.

On the opposite, if `is_plural` is `false` on your translation_key, then you need to provide `"quantity_string": null` when creating your value:
```json
{
  "name": "a new value of a simple key",
  "language_id": "1",
  "quantity_string": null
}
```

## Switch between simple and plural keys

When switching a plural translation_key to a simple one, only the value with `"quantity_string": "other"` will be kept and stored as a single value.

Other values for `"one"` and `"other"` quantities will be lost.
