# Plurals

When creating a translation key with the `POST /api/v1/projects/{projectId}/translations` endpoint, you need to provide the following request body:
```json
{
  "name": string,
  "groupId": integer,
  "isPlural": boolean
}
```

## Creating a translation_value

If `isPlural` is set to `true`, you need to provide a `quantityString` when creating a translation_value:
```json
{
  "name": "a new value of a plural key",
  "languageId": "1",
  "quantityString": "one"
}
```

`quantityString` is one of: `"zero"`, `"one"` or `"other"`.

On the opposite, if `isPlural` is `false` on your translation_key, then you need to provide `"quantityString": null` when creating your value:
```json
{
  "name": "a new value of a simple key",
  "languageId": "1",
  "quantityString": null
}
```

## Switch between simple and plural keys

When switching a plural translation_key to a simple one, only the value with `"quantityString": "other"` will be kept and stored as a single value.

Other values for `"one"` and `"other"` quantities will be lost.
