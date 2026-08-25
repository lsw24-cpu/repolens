# Semantic Review Method

## Review unit

Review one report field at a time. A field containing several factual statements receives the rating of its weakest statement.

## Ratings

- **Supported:** cited source directly supports every verifiable factual statement.
- **Partially supported:** the central statement is supported, but part of its scope or wording exceeds the cited source.
- **Unsupported:** cited source contradicts the statement or does not support its central claim.
- **Unverifiable:** available evidence is insufficient to determine support.

## Checks

For each report:

1. Record the full repository revision.
2. Confirm that every factual field cites server-issued evidence identifiers.
3. Open each cited source link and compare the excerpt with the claim.
4. Confirm that displayed commands appear verbatim in cited repository evidence.
5. Check that interpretation, unknowns, and execution status are labeled distinctly.
6. Record supported, partial, unsupported, and unverifiable field counts.

## Scores

- Strict support = supported fields divided by all reviewed fields.
- Weighted support = supported fields plus half of partially supported fields, divided by all reviewed fields.

These scores measure evidence support in the displayed report. They do not measure scientific correctness beyond the retrieved evidence or successful execution of an experiment.
